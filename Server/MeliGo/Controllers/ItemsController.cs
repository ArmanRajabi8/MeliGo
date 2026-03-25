using System.Globalization;
using System.Security.Claims;
using System.Text.RegularExpressions;
using MeliGo.Data;
using MeliGo.Models;
using MeliGo.Models.DTOs;
using MeliGo.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MeliGo.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ItemsController : ControllerBase
    {
        private readonly MeliGoContext _context;
        private readonly MetadataService _metadataService;

        public ItemsController(MeliGoContext context, MetadataService metadataService)
        {
            _context = context;
            _metadataService = metadataService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Item>>> GetItems()
        {
            return await _context.Items.ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Item>> GetItemById(int id)
        {
            var item = await _context.Items.FindAsync(id);
            if (item == null)
            {
                return NotFound();
            }

            return item;
        }

        [HttpGet("user/{userId}")]
        [Authorize]
        public async Task<ActionResult<IEnumerable<Item>>> GetByUser(string userId)
        {
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (currentUserId == null)
            {
                return Unauthorized();
            }

            if (!string.Equals(currentUserId, userId, StringComparison.Ordinal))
            {
                return Forbid();
            }

            return await _context.Items
                .Where(i => i.UserId == userId)
                .OrderByDescending(i => i.DateAdded)
                .ToListAsync();
        }

        [HttpPost]
        [Authorize]
        public async Task<ActionResult<Item>> PostItem([FromBody] ItemCreateDto itemDto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null)
            {
                return Unauthorized();
            }

            var item = new Item
            {
                Name = string.IsNullOrWhiteSpace(itemDto.Name) ? "Untitled item" : itemDto.Name.Trim(),
                Price = itemDto.Price,
                ImageUrl = string.IsNullOrWhiteSpace(itemDto.ImageUrl) ? null : itemDto.ImageUrl.Trim(),
                Link = string.IsNullOrWhiteSpace(itemDto.Link) ? string.Empty : itemDto.Link.Trim(),
                Category = string.IsNullOrWhiteSpace(itemDto.Category) ? "Uncategorized" : itemDto.Category.Trim(),
                Importance = Math.Clamp(itemDto.Importance, 1, 5),
                DateAdded = DateTime.UtcNow,
                UserId = userId
            };

            _context.Items.Add(item);
            await _context.SaveChangesAsync();

            return CreatedAtAction(
                nameof(GetItemById),
                new { id = item.Id },
                item
            );
        }

        [HttpPut("{id}")]
        [Authorize]
        public async Task<ActionResult<Item>> UpdateItem(int id, [FromBody] ItemCreateDto updatedItem)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null)
            {
                return Unauthorized();
            }

            var existingItem = await _context.Items.FirstOrDefaultAsync(item => item.Id == id && item.UserId == userId);
            if (existingItem == null)
            {
                return NotFound();
            }

            existingItem.Name = string.IsNullOrWhiteSpace(updatedItem.Name) ? existingItem.Name : updatedItem.Name.Trim();
            existingItem.Price = updatedItem.Price;
            existingItem.ImageUrl = string.IsNullOrWhiteSpace(updatedItem.ImageUrl) ? null : updatedItem.ImageUrl.Trim();
            existingItem.Link = string.IsNullOrWhiteSpace(updatedItem.Link) ? existingItem.Link : updatedItem.Link.Trim();
            existingItem.Category = string.IsNullOrWhiteSpace(updatedItem.Category) ? "Uncategorized" : updatedItem.Category.Trim();
            existingItem.Importance = Math.Clamp(updatedItem.Importance, 1, 5);

            await _context.SaveChangesAsync();
            return Ok(existingItem);
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteItem(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null)
            {
                return Unauthorized();
            }

            var item = await _context.Items.FirstOrDefaultAsync(existingItem => existingItem.Id == id && existingItem.UserId == userId);
            if (item == null)
            {
                return NotFound();
            }

            _context.Items.Remove(item);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpPost("link")]
        [Authorize]
        public async Task<ActionResult<Item>> AddItemFromLink([FromBody] LinkDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null)
            {
                return Unauthorized();
            }

            if (string.IsNullOrWhiteSpace(dto.Link))
            {
                return BadRequest("A product link is required.");
            }

            var title = dto.Title;
            var imageUrl = dto.ImageUrl;

            if ((string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(imageUrl)) && Uri.IsWellFormedUriString(dto.Link, UriKind.Absolute))
            {
                var (fallbackTitle, fallbackImage) = await _metadataService.GetMetadataAsync(dto.Link);
                title = string.IsNullOrWhiteSpace(title) ? fallbackTitle : title;
                imageUrl = string.IsNullOrWhiteSpace(imageUrl) ? fallbackImage : imageUrl;
            }

            var fallbackGalleryImage = dto.ImageUrls?.FirstOrDefault();
            var extractedImageCount = dto.ImageUrls?.Count ?? 0;

            var item = new Item
            {
                Name = string.IsNullOrWhiteSpace(title) ? "Unknown product" : title.Trim(),
                ImageUrl = string.IsNullOrWhiteSpace(imageUrl) ? fallbackGalleryImage : imageUrl,
                Link = dto.Link,
                Price = ResolvePrice(dto),
                Category = "Uncategorized",
                Importance = 1,
                DateAdded = DateTime.UtcNow,
                UserId = userId
            };

            _context.Items.Add(item);
            await _context.SaveChangesAsync();

            Console.WriteLine(
                "[Extension Input] Title: '{0}', Price: '{1}', ImageCount: {2}, Link: '{3}'",
                dto.Title,
                dto.PriceText ?? dto.Price?.ToString(CultureInfo.InvariantCulture) ?? "n/a",
                extractedImageCount,
                dto.Link
            );

            return item;
        }

        private static decimal ResolvePrice(LinkDto dto)
        {
            if (dto.Price.HasValue)
            {
                return dto.Price.Value;
            }

            if (string.IsNullOrWhiteSpace(dto.PriceText))
            {
                return 0;
            }

            var cleaned = Regex.Replace(dto.PriceText, @"[^\d,.\-]", "");
            if (string.IsNullOrWhiteSpace(cleaned))
            {
                return 0;
            }

            var normalized = NormalizePriceString(cleaned);

            return decimal.TryParse(
                normalized,
                NumberStyles.Number | NumberStyles.AllowLeadingSign,
                CultureInfo.InvariantCulture,
                out var parsedPrice)
                ? parsedPrice
                : 0;
        }

        private static string NormalizePriceString(string value)
        {
            var lastComma = value.LastIndexOf(',');
            var lastDot = value.LastIndexOf('.');

            if (lastComma >= 0 && lastDot >= 0)
            {
                var decimalSeparator = lastComma > lastDot ? ',' : '.';
                var thousandsSeparator = decimalSeparator == ',' ? "." : ",";

                value = value.Replace(thousandsSeparator, string.Empty);
                if (decimalSeparator == ',')
                {
                    value = value.Replace(',', '.');
                }

                return value;
            }

            if (value.Count(character => character == ',') > 1)
            {
                var parts = value.Split(',');
                value = string.Concat(parts.Take(parts.Length - 1)) + "." + parts.Last();
            }
            else if (value.Count(character => character == '.') > 1)
            {
                var parts = value.Split('.');
                value = string.Concat(parts.Take(parts.Length - 1)) + "." + parts.Last();
            }
            else if (lastComma >= 0)
            {
                var decimalDigits = value.Length - lastComma - 1;
                value = decimalDigits == 2 ? value.Replace(',', '.') : value.Replace(",", string.Empty);
            }

            return value;
        }
    }
}
