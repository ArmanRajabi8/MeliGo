using MeliGo.Data;
using MeliGo.Models;
using MeliGo.Models.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MeliGo.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class HubsController : ControllerBase
    {
        private readonly MeliGoContext _context;
        private readonly UserManager<User> _userManager;

        public HubsController(MeliGoContext context, UserManager<User> userManager)
        {
            _context = context;
            _userManager = userManager;
        }
        
        [HttpGet("GetUserHubs")]
        public async Task<IActionResult> GetUserHubs()
        {
            var username = User.Identity?.Name;
            if (string.IsNullOrEmpty(username))
                return Unauthorized("Username claim missing.");

            var user = await _userManager.FindByNameAsync(username);
            if (user == null) return Unauthorized("User not found.");

            var items = await _context.Items
                .Where(i => i.UserId == user.Id)
                .Select(i => new {
                    i.Id,
                    i.Name,
                    i.Price,
                    i.ImageUrl,
                    i.DateAdded,
                    i.Importance,
                    i.Category
                }).ToListAsync();

            return Ok(items);
        }

        [HttpPost("AddItem")]
        public async Task<IActionResult> AddItem([FromBody] ItemDTO dto)
        {
            var username = User.Identity?.Name;
            var user = await _userManager.FindByNameAsync(username);
            if (user == null) return Unauthorized();

            var item = new Item
            {
                Name = dto.Name,
                Price = dto.Price,
                ImageUrl = dto.ImageUrl,
                DateAdded = DateTime.UtcNow,
                UserId = user.Id,
                Importance = dto.Importance,
                Category = dto.Category
            };

            _context.Items.Add(item);
            await _context.SaveChangesAsync();
            return Ok(item);
        }

        [HttpPut("UpdateItem/{id}")]
        public async Task<IActionResult> UpdateItem(int id, [FromBody] ItemDTO dto)
        {
            var username = User.Identity?.Name;
            if (string.IsNullOrEmpty(username))
                return Unauthorized("Username claim missing.");

            var user = await _userManager.FindByNameAsync(username);
            if (user == null)
                return Unauthorized("User not found.");

            var item = await _context.Items.FindAsync(id);
            if (item == null) return NotFound();

            if (item.UserId != user.Id)
                return Forbid("You are not allowed to modify this item.");

          

            item.Name = dto.Name;
            item.Price = dto.Price;
            item.ImageUrl = dto.ImageUrl;
            item.Importance = dto.Importance;
            item.Category = dto.Category;

            await _context.SaveChangesAsync();
            return Ok(item);
        }

        [HttpDelete("DeleteItem/{id}")]
        public async Task<IActionResult> DeleteItem(int id)
        {
            var username = User.Identity?.Name;
            if (string.IsNullOrEmpty(username))
                return Unauthorized("Username claim missing.");

            var user = await _userManager.FindByNameAsync(username);
            if (user == null)
                return Unauthorized("User not found.");

            var item = await _context.Items.FindAsync(id);
            if (item == null) return NotFound();

            if (item.UserId != user.Id)
                return Forbid("You are not allowed to modify this item.");

            _context.Items.Remove(item);
            await _context.SaveChangesAsync();
            return Ok();
        }
    }

}
