using System.ComponentModel.DataAnnotations;

namespace MeliGo.Models.DTOs
{
    public class HubCreateDto
    {
        [Required]
        public string Name { get; set; } = string.Empty;
    }
}
