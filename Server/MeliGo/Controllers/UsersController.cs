using MeliGo.Models;
using MeliGo.Models.DTOs;
using MeliGo.Data;
using MeliGo.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace MeliGo.Controllers
{
    [Route("api/[controller]/[action]")] // Utilisez cette règle de routage globale !
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly UserManager<User> _userManager;
        readonly PictureService _pictureService;
        private readonly MeliGoContext _context;

        public UsersController(UserManager<User> userManager, PictureService pictureService, MeliGoContext context)
        {
            _userManager = userManager;
            _pictureService = pictureService;
            _context = context;
        }



        [HttpPost]
        public async Task<ActionResult> Register(RegisterDTO register)
        {
            if (register.Password != register.PasswordConfirm)
            {
                return StatusCode(StatusCodes.Status400BadRequest,
                    new { Message = "Passwords do not match." });
            }
            User user = new User()
            {
                UserName = register.Username,
                Email = register.Email
            };
            IdentityResult identityResult = await _userManager.CreateAsync(user, register.Password);
            if (!identityResult.Succeeded)
            {
                return BadRequest(new
                {
                    Message = "User creation failed.",
                    Errors = identityResult.Errors.Select(error => error.Description)
                });
            }
            return Ok(new { Message = "Registration successful." });
        }

        [HttpPost]
        public async Task<ActionResult> Login(LoginDTO login)
        {
            User? user = await _userManager.FindByNameAsync(login.Username);

            if (user == null)
            {
                user = await _userManager.FindByEmailAsync(login.Username);
            }
            if (user != null && await _userManager.CheckPasswordAsync(user, login.Password))
            {
                IList<string> roles = await _userManager.GetRolesAsync(user);
                List<Claim> authClaims = new List<Claim>();

                // Ajoute la claim "name"
                authClaims.Add(new Claim(ClaimTypes.Name, user.UserName ?? ""));

                foreach (string role in roles)
                {
                    authClaims.Add(new Claim(ClaimTypes.Role, role));
                }
                authClaims.Add(new Claim(ClaimTypes.NameIdentifier, user.Id));

                SymmetricSecurityKey key = new SymmetricSecurityKey(Encoding.UTF8
                    .GetBytes(HttpContext.RequestServices.GetRequiredService<IConfiguration>()["Jwt:Key"]
                        ?? throw new InvalidOperationException("Jwt:Key is not configured.")));

                JwtSecurityToken token = new JwtSecurityToken(
                    issuer: HttpContext.RequestServices.GetRequiredService<IConfiguration>()["Jwt:Issuer"] ?? "meligo",
                    audience: HttpContext.RequestServices.GetRequiredService<IConfiguration>()["Jwt:Audience"] ?? "meligo-web",
                    claims: authClaims,
                    expires: DateTime.Now.AddMinutes(300),
                    signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256Signature)
                );

                return Ok(new
                {
                    token = new JwtSecurityTokenHandler().WriteToken(token),
                    validTo = token.ValidTo,
                    username = user.UserName,
                    roles = roles,
                    userId = user.Id
                });
            }
            else
            {
                return StatusCode(StatusCodes.Status400BadRequest,
                    new { Message = "Invalid username or password." });
            }
        }

        [HttpPost]
        [Authorize]
        public async Task<ActionResult> ShareList(ShareListDto dto)
        {
            var ownerUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (ownerUserId == null)
            {
                return Unauthorized();
            }

            var targetValue = dto.TargetUser?.Trim();
            if (string.IsNullOrWhiteSpace(targetValue))
            {
                return BadRequest(new { Message = "Username or email is required." });
            }

            User? targetUser = await _userManager.FindByNameAsync(targetValue);
            if (targetUser == null)
            {
                targetUser = await _userManager.FindByEmailAsync(targetValue);
            }

            if (targetUser == null)
            {
                return NotFound(new { Message = "User not found." });
            }

            if (string.Equals(targetUser.Id, ownerUserId, StringComparison.Ordinal))
            {
                return BadRequest(new { Message = "You cannot share your list with yourself." });
            }

            var alreadyShared = await _context.ListShares.AnyAsync(share =>
                share.OwnerUserId == ownerUserId && share.SharedWithUserId == targetUser.Id);

            if (alreadyShared)
            {
                return Ok(new
                {
                    Message = "List already shared.",
                    sharedWithUserId = targetUser.Id,
                    sharedWithUsername = targetUser.UserName
                });
            }

            _context.ListShares.Add(new ListShare
            {
                OwnerUserId = ownerUserId,
                SharedWithUserId = targetUser.Id,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            return Ok(new
            {
                Message = "List shared.",
                sharedWithUserId = targetUser.Id,
                sharedWithUsername = targetUser.UserName
            });
        }

        [HttpGet]
        [Authorize]
        public async Task<ActionResult<IEnumerable<object>>> SharedWithMe()
        {
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (currentUserId == null)
            {
                return Unauthorized();
            }

            var shares = await _context.ListShares
                .Where(share => share.SharedWithUserId == currentUserId)
                .Join(_context.Users,
                    share => share.OwnerUserId,
                    user => user.Id,
                    (share, user) => new
                    {
                        ownerUserId = user.Id,
                        ownerUsername = user.UserName,
                        sharedAt = share.CreatedAt
                    })
                .ToListAsync();

            return Ok(shares);
        }

        [HttpPost]
        [Authorize]
        public async Task<ActionResult> UnshareList(ShareListDto dto)
        {
            var ownerUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (ownerUserId == null)
            {
                return Unauthorized();
            }

            var targetValue = dto.TargetUser?.Trim();
            if (string.IsNullOrWhiteSpace(targetValue))
            {
                return BadRequest(new { Message = "Username or email is required." });
            }

            User? targetUser = await _userManager.FindByNameAsync(targetValue);
            if (targetUser == null)
            {
                targetUser = await _userManager.FindByEmailAsync(targetValue);
            }

            if (targetUser == null)
            {
                return NotFound(new { Message = "User not found." });
            }

            var share = await _context.ListShares.FirstOrDefaultAsync(existing =>
                existing.OwnerUserId == ownerUserId && existing.SharedWithUserId == targetUser.Id);

            if (share == null)
            {
                return NotFound(new { Message = "No share found for this user." });
            }

            _context.ListShares.Remove(share);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Share removed." });
        }

        [HttpPut]
        [Authorize]
        public async Task<ActionResult<Picture>> ProfilePic()
        {
            User? user = await _userManager.FindByIdAsync(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            if (user == null) return Unauthorized();

            IFormCollection formCollection = await Request.ReadFormAsync();
            IFormFile? file = formCollection.Files.GetFile("monImage"); // ⛔ Même clé que dans le FormData 😠

            if (file == null) return BadRequest(new { Message = "Please provide an image." });

            using SixLabors.ImageSharp.Image image = SixLabors.ImageSharp.Image.Load(file.OpenReadStream());

            user.FileName = Guid.NewGuid().ToString() + Path.GetExtension(file.FileName);
            user.MimeType = file.ContentType;

            string avatarDirectory = Path.Combine(Directory.GetCurrentDirectory(), "images", "avatar");
            Directory.CreateDirectory(avatarDirectory);

            string avatarPath = Path.Combine(avatarDirectory, user.FileName);
            await image.SaveAsync(avatarPath);

            IdentityResult updateResult = await _userManager.UpdateAsync(user);
            if (!updateResult.Succeeded)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    Message = "Avatar update failed.",
                    Errors = updateResult.Errors.Select(error => error.Description)
                });
            }

            // La seule chose dont le client pourrait avoir besoin, c'est l'id de l'image.
            // On aurait pu ne rien retourner aussi, selon les besoins du client Angular.
            return Ok();

        }
        [HttpGet("{username}")]
        public async Task<ActionResult<Picture>> GetAvatar(string username)
        {

            User? user = await _userManager.FindByNameAsync(username);
            if (user == null) return NotFound(new { Message = "User not found." });

            if (string.IsNullOrWhiteSpace(user.FileName) || string.IsNullOrWhiteSpace(user.MimeType))
            {
                return DefaultAvatar();
            }

            string avatarPath = Path.Combine(Directory.GetCurrentDirectory(), "images", "avatar", user.FileName);
            if (!System.IO.File.Exists(avatarPath))
            {
                return DefaultAvatar();
            }

            byte[] bytes = await System.IO.File.ReadAllBytesAsync(avatarPath);
            return File(bytes, user.MimeType!);

        }

        private ActionResult<Picture> DefaultAvatar()
        {
            string defaultAvatarPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "assets", "images", "default.jpg");
            return System.IO.File.Exists(defaultAvatarPath)
                ? PhysicalFile(defaultAvatarPath, "image/jpeg")
                : NotFound(new { Message = "Default avatar file not found." });
        }

        [HttpPost]
        [Authorize]
        public async Task<ActionResult> ChangePassword(ChangePasswordDTO dto)
        {
            string userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            User? user = await _userManager.FindByIdAsync(userId);

            if (user == null)
                return Unauthorized();

            if (dto.NewPassword != dto.NewPasswordConfirm)
            {
                return BadRequest(new { Message = "New passwords do not match." });
            }

            IdentityResult result = await _userManager.ChangePasswordAsync(user, dto.OldPassword, dto.NewPassword);

            if (!result.Succeeded)
            {
                return BadRequest(new { Message = "Password change failed." });
            }

            return Ok(new { Message = "Password updated successfully." });
        }
        [HttpPost]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> AddModerator(string username)
        {
            User? user = await _userManager.FindByNameAsync(username);
            if (user == null) return NotFound(new { Message = "User not found." });

            IdentityResult result = await _userManager.AddToRoleAsync(user, "moderator");
            if (result.Succeeded) return Ok(new { Message = "Role created." });
            else return BadRequest(new { Message = "Role creation failed." });

        }
    }

}
