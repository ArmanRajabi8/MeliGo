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
        public async Task<ActionResult<IEnumerable<Item>>> GetByUser(string userId, [FromQuery] int? hubId = null)
        {
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (currentUserId == null)
            {
                return Unauthorized();
            }

            if (!string.Equals(currentUserId, userId, StringComparison.Ordinal))
            {
                var hasSharedAccess = await _context.ListShares.AnyAsync(share =>
                    share.OwnerUserId == userId && share.SharedWithUserId == currentUserId);

                if (!hasSharedAccess)
                {
                    return Forbid();
                }
            }

            var defaultHub = await GetDefaultHubAsync(userId, createIfMissing: string.Equals(currentUserId, userId, StringComparison.Ordinal));
            if (defaultHub != null)
            {
                await AssignOrphanItemsToHubAsync(userId, defaultHub.Id);
            }

            var query = _context.Items
                .Where(i => i.UserId == userId);

            if (hubId.HasValue)
            {
                var hubValue = hubId.Value;
                query = query.Where(i =>
                    i.HubId == hubValue ||
                    (i.HubId == null && defaultHub != null && hubValue == defaultHub.Id));
            }

            return await query
                .OrderByDescending(i => i.DateAdded)
                .Select(i => new Item
                {
                    Id = i.Id,
                    Name = i.Name,
                    Price = i.Price,
                    ImageUrl = i.ImageUrl,
                    Link = i.Link,
                    DateAdded = i.DateAdded,
                    Importance = i.Importance,
                    Category = i.Category,
                    UserId = i.UserId,
                    HubId = i.HubId
                })
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

            var hubId = await ResolveHubIdAsync(userId, itemDto.HubId);
            if (itemDto.HubId.HasValue && hubId == null)
            {
                return BadRequest(new { Message = "The selected cart does not exist." });
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
                UserId = userId,
                HubId = hubId
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

            if (updatedItem.HubId.HasValue)
            {
                var resolvedHubId = await ResolveHubIdAsync(userId, updatedItem.HubId);
                if (resolvedHubId == null)
                {
                    return BadRequest(new { Message = "The selected cart does not exist." });
                }

                existingItem.HubId = resolvedHubId;
            }

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
        public async Task<IActionResult> AddItemFromLink([FromBody] LinkDto dto)
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

            var hubId = await ResolveHubIdAsync(userId, dto.HubId);
            if (dto.HubId.HasValue && hubId == null)
            {
                return BadRequest(new { Message = "The selected cart does not exist." });
            }

            var item = new Item
            {
                Name = string.IsNullOrWhiteSpace(title) ? "Unknown product" : title.Trim(),
                ImageUrl = string.IsNullOrWhiteSpace(imageUrl) ? fallbackGalleryImage : imageUrl,
                Link = dto.Link,
                Price = ResolvePrice(dto),
                Category = "Uncategorized",
                Importance = 1,
                DateAdded = DateTime.UtcNow,
                UserId = userId,
                HubId = hubId
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

            return Ok(new
            {
                item.Id,
                item.Name,
                item.Price,
                item.ImageUrl,
                item.Link,
                item.DateAdded,
                item.Importance,
                item.Category,
                item.UserId,
                item.HubId
            });
        }

        private static decimal ResolvePrice(LinkDto dto)
        {
            if (!string.IsNullOrWhiteSpace(dto.PriceText))
            {
                var parsedTextPrice = ParsePriceText(dto.PriceText);
                if (parsedTextPrice.HasValue)
                {
                    return parsedTextPrice.Value;
                }
            }

            return dto.Price ?? 0;
        }

        private static decimal? ParsePriceText(string? priceText)
        {
            if (string.IsNullOrWhiteSpace(priceText))
            {
                return null;
            }

            var priceMatch = Regex.Match(
                priceText,
                @"(?<!\d)(?:\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,]\d{2})(?!\d)");
            var priceValue = priceMatch.Success ? priceMatch.Value : priceText;
            var cleaned = Regex.Replace(priceValue, @"[^\d,.\-]", "");
            if (string.IsNullOrWhiteSpace(cleaned))
            {
                return null;
            }

            var normalized = NormalizePriceString(cleaned);

            return decimal.TryParse(
                normalized,
                NumberStyles.Number | NumberStyles.AllowLeadingSign,
                CultureInfo.InvariantCulture,
                out var parsedPrice)
                ? parsedPrice
                : null;
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

        private async Task<int?> ResolveHubIdAsync(string userId, int? requestedHubId)
        {
            if (requestedHubId.HasValue)
            {
                var exists = await _context.Hubs.AnyAsync(hub =>
                    hub.Id == requestedHubId.Value && hub.OwnerUserId == userId);

                if (!exists)
                {
                    return null;
                }

                return requestedHubId.Value;
            }

            var defaultHub = await GetDefaultHubAsync(userId, createIfMissing: true);
            return defaultHub?.Id;
        }

        private async Task<Hub?> GetDefaultHubAsync(string userId, bool createIfMissing)
        {
            var hub = await _context.Hubs.FirstOrDefaultAsync(existing =>
                existing.OwnerUserId == userId && existing.IsDefault);

            if (hub != null || !createIfMissing)
            {
                return hub;
            }

            hub = new Hub
            {
                Name = "Main cart",
                OwnerUserId = userId,
                IsDefault = true
            };

            _context.Hubs.Add(hub);
            await _context.SaveChangesAsync();

            return hub;
        }

        private async Task AssignOrphanItemsToHubAsync(string userId, int hubId)
        {
            var orphans = await _context.Items
                .Where(item => item.UserId == userId && item.HubId == null)
                .ToListAsync();

            if (orphans.Count == 0)
            {
                return;
            }

            foreach (var item in orphans)
            {
                item.HubId = hubId;
            }

            await _context.SaveChangesAsync();
        }
    }
}
