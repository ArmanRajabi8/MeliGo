using MeliGo.Data;
using MeliGo.Models;
using MeliGo.Models.DTOs;
using System.Security.Claims;
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
        public async Task<ActionResult<IEnumerable<Hub>>> GetUserHubs()
        {
            var userId = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            return await _context.Hubs
                .Where(hub => hub.OwnerUserId == userId)
                .OrderByDescending(hub => hub.IsDefault)
                .ThenBy(hub => hub.Name)
                .Select(hub => new Hub
                {
                    Id = hub.Id,
                    Name = hub.Name,
                    OwnerUserId = hub.OwnerUserId,
                    IsDefault = hub.IsDefault,
                    CreatedAt = hub.CreatedAt,
                    ItemCount = hub.Items.Count
                })
                .ToListAsync();
        }

        [HttpPost]
        public async Task<ActionResult<Hub>> CreateHub([FromBody] HubCreateDto dto)
        {
            var userId = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();
            if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("A cart name is required.");

            var hub = new Hub
            {
                Name = dto.Name.Trim(),
                OwnerUserId = userId,
                IsDefault = false
            };

            _context.Hubs.Add(hub);
            await _context.SaveChangesAsync();
            return Ok(hub);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<Hub>> RenameHub(int id, [FromBody] HubCreateDto dto)
        {
            var userId = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();
            if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("A cart name is required.");

            var hub = await _context.Hubs.FirstOrDefaultAsync(h => h.Id == id && h.OwnerUserId == userId);
            if (hub == null) return NotFound();
            hub.Name = dto.Name.Trim();
            await _context.SaveChangesAsync();
            return Ok(hub);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteHub(int id)
        {
            var userId = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var hub = await _context.Hubs.FirstOrDefaultAsync(h => h.Id == id && h.OwnerUserId == userId);
            if (hub == null) return NotFound();
            if (hub.IsDefault) return BadRequest("The default cart cannot be deleted.");

            var defaultHub = await _context.Hubs.FirstOrDefaultAsync(h => h.OwnerUserId == userId && h.IsDefault);
            if (defaultHub != null)
            {
                await _context.Items
                    .Where(item => item.HubId == hub.Id)
                    .ExecuteUpdateAsync(setters => setters.SetProperty(item => item.HubId, defaultHub.Id));
            }

            _context.Hubs.Remove(hub);
            await _context.SaveChangesAsync();
            return Ok();
        }
    }

}
