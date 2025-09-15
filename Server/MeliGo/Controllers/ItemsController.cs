using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MeliGo.Data;
using MeliGo.Models;
using MeliGo.Services;
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
        public async Task<ActionResult<Item>> PostItemFromLink([FromBody] LinkDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Link) ||
                string.IsNullOrWhiteSpace(dto.UserId))
            {
                return BadRequest("Link and UserId are required.");
            }

            var meta = await _metadataService.GetMetadataAsync(dto.Link);

            var item = new Item
            {
                Name = meta.Title ?? "Unknown product",
                Link = dto.Link,
                Price = 0,
                ImageUrl = meta.ImageUrl,
                Category = "Uncategorized",
                Importance = 1,
                DateAdded = DateTime.UtcNow,
                UserId = dto.UserId
            };

            _context.Items.Add(item);
            await _context.SaveChangesAsync();

            return CreatedAtAction(
                nameof(GetItemById),
                new { id = item.Id },
                item
            );
        }

        public class LinkDto
        {
            public string Link { get; set; }
            public string UserId { get; set; }
        }
    }
}