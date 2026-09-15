using System.ComponentModel.DataAnnotations;

namespace MeliGo.Models.DTOs
{
    public class HubRenameDto
    {
        [Required]
        public string Name { get; set; } = string.Empty;
    }
}
