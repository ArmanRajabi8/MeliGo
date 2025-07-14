using MeliGo.Models;
using MeliGo.Models.DTOs;
using MeliGo.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
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

        public UsersController(UserManager<User> userManager, PictureService pictureService)
        {
            _userManager = userManager;
            _pictureService = pictureService;
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
                    roles = roles
                });
            }
            else
            {
                return StatusCode(StatusCodes.Status400BadRequest,
                    new { Message = "Le nom d'utilisateur ou le mot de passe est invalide." });
            }
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
