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
                    new { Message = "Les deux mots de passe spécifiés sont différents." });
            }
            User user = new User()
            {
                UserName = register.Username,
                Email = register.Email
            };
            IdentityResult identityResult = await _userManager.CreateAsync(user, register.Password);
            if (!identityResult.Succeeded)
            {
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { Message = "La création de l'utilisateur a échoué." });
            }
            return Ok(new { Message = "Inscription réussie ! 🥳" });
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
                    .GetBytes("LooOOongue Phrase SiNoN Ça ne Marchera PaAaAAAaAas !"));

                JwtSecurityToken token = new JwtSecurityToken(
                    issuer: "https://localhost:7066",
                    audience: "http://localhost:4200",
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
                    new { Message = "Le nom d'utilisateur ou le mot de passe est invalide." });
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
                return BadRequest(new { Message = "Le nom d'utilisateur ou email est requis." });
            }

            User? targetUser = await _userManager.FindByNameAsync(targetValue);
            if (targetUser == null)
            {
                targetUser = await _userManager.FindByEmailAsync(targetValue);
            }

            if (targetUser == null)
            {
                return NotFound(new { Message = "Utilisateur introuvable." });
            }

            if (string.Equals(targetUser.Id, ownerUserId, StringComparison.Ordinal))
            {
                return BadRequest(new { Message = "Vous ne pouvez pas partager votre liste avec vous-même." });
            }

            var alreadyShared = await _context.ListShares.AnyAsync(share =>
                share.OwnerUserId == ownerUserId && share.SharedWithUserId == targetUser.Id);

            if (alreadyShared)
            {
                return Ok(new
                {
                    Message = "Liste déjà partagée.",
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
                Message = "Liste partagée.",
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
                return BadRequest(new { Message = "Le nom d'utilisateur ou email est requis." });
            }

            User? targetUser = await _userManager.FindByNameAsync(targetValue);
            if (targetUser == null)
            {
                targetUser = await _userManager.FindByEmailAsync(targetValue);
            }

            if (targetUser == null)
            {
                return NotFound(new { Message = "Utilisateur introuvable." });
            }

            var share = await _context.ListShares.FirstOrDefaultAsync(existing =>
                existing.OwnerUserId == ownerUserId && existing.SharedWithUserId == targetUser.Id);

            if (share == null)
            {
                return NotFound(new { Message = "Aucun partage trouvé pour cet utilisateur." });
            }

            _context.ListShares.Remove(share);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Partage supprimé." });
        }

        [HttpPut]
        public async Task<ActionResult<Picture>> ProfilePic()
        {
            try
            {
                User? user = await _userManager.FindByIdAsync(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                if (user == null) return Unauthorized();

                IFormCollection formCollection = await Request.ReadFormAsync();
                IFormFile? file = formCollection.Files.GetFile("monImage"); // ⛔ Même clé que dans le FormData 😠

                if (file == null) return BadRequest(new { Message = "Fournis une image, niochon" });

                SixLabors.ImageSharp.Image image = SixLabors.ImageSharp.Image.Load(file.OpenReadStream());

                user.FileName = Guid.NewGuid().ToString() + Path.GetExtension(file.FileName);
                user.MimeType = file.ContentType;


                // ⛔ Ce dossier (projet/images/big) DOIT déjà exister 📂 !! Créez-le d'abord !
                image.Save(Directory.GetCurrentDirectory() + "/images/avatar/" + user.FileName);

                await _userManager.UpdateAsync(user);



                // La seule chose dont le client pourrait avoir besoin, c'est l'id de l'image.
                // On aurait pu ne rien retourner aussi, selon les besoins du client Angular.
                return Ok();
            }
            catch (Exception)
            {
                throw;
            }

        }
        [HttpGet("{username}")]
        public async Task<ActionResult<Picture>> GetAvatar(string username)
        {

            User? user = await _userManager.FindByNameAsync(username);
            if (user == null) return Unauthorized();

            byte[] bytes = System.IO.File.ReadAllBytes(Directory.GetCurrentDirectory() + "/images/avatar/" + user.FileName);
            return File(bytes, user.MimeType!);

        }

        [HttpPost]
        public async Task<ActionResult> ChangePassword(ChangePasswordDTO dto)
        {
            string userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            User? user = await _userManager.FindByIdAsync(userId);

            if (user == null)
                return Unauthorized();

            if (dto.NewPassword != dto.NewPasswordConfirm)
            {
                return BadRequest(new { Message = "Les nouveaux mots de passe ne correspondent pas." });
            }

            IdentityResult result = await _userManager.ChangePasswordAsync(user, dto.OldPassword, dto.NewPassword);

            if (!result.Succeeded)
            {
                return BadRequest(new { Message = "Échec du changement de mot de passe." });
            }

            return Ok(new { Message = "Mot de passe changé avec succès !" });
        }
        [HttpPost]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> AddModerator(string username)
        {
            User? user = await _userManager.FindByNameAsync(username);
            if (user == null) return NotFound(new { Message = "Utilisateur introuvable." });

            IdentityResult result = await _userManager.AddToRoleAsync(user, "moderator");
            if (result.Succeeded) return Ok(new { Message = "Rôle créé !" });
            else return BadRequest(new { Message = "La création du rôle a échoué." });

        }
    }

}
