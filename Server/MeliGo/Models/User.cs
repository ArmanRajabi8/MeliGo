using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;

namespace MeliGo.Models
{
    public class User : IdentityUser
    {

        public string? FileName { get; set; }
        public string? MimeType { get; set; }
    }
}
