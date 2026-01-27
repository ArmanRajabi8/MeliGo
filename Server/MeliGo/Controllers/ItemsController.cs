using MeliGo.Data;
using MeliGo.Models;
using MeliGo.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using MeliGo.Models.DTOs;
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

        // GET: api/Items
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Item>>> GetItems()
        {
            return await _context.Items.ToListAsync();
        }

        // GET: api/Items/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Item>> GetItemById(int id)
        {
            var item = await _context.Items.FindAsync(id);
            if (item == null)
                return NotFound();
            return item;
        }

        // GET: api/Items/user/{userId}
        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<Item>>> GetByUser(string userId)
        {
            return await _context.Items
                                 .Where(i => i.UserId == userId)
                                 .ToListAsync();
        }

        // POST: api/Items
        [HttpPost]
        public async Task<ActionResult<Item>> PostItem(Item item)
        {
            _context.Items.Add(item);
            await _context.SaveChangesAsync();

            return CreatedAtAction(
                nameof(GetItemById),
                new { id = item.Id },
                item
            );
        }

        // POST: api/Items/link
        [HttpPost("link")]
        [Authorize]
        public async Task<ActionResult<Item>> AddItemFromLink([FromBody] LinkDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();
            var title = dto.Title;
            var imageUrl = dto.ImageUrl;

            if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(imageUrl))
            {
                var (fallbackTitle, fallbackImage) = await _metadataService.GetMetadataAsync(dto.Link);
                title = string.IsNullOrWhiteSpace(title) ? fallbackTitle : title;
                imageUrl = string.IsNullOrWhiteSpace(imageUrl) ? fallbackImage : imageUrl;
            }
            Console.WriteLine($"[Extension Input] Title: '{dto.Title}', ImageUrl: '{dto.ImageUrl}', Link: '{dto.Link}'");
            var item = new Item
            {
                Name = title ?? "Unknown product",
                ImageUrl = imageUrl,
                Link = dto.Link,
                Price = 0,
                Category = "Uncategorized",
                Importance = 1,
                DateAdded = DateTime.UtcNow,
                UserId = userId
            };

            _context.Items.Add(item);
            await _context.SaveChangesAsync();

            return item;
        }


    
    }
}