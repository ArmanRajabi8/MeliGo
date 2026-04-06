using System.ComponentModel.DataAnnotations;

namespace MeliGo.Models.DTOs
{
    public class ShareListDto
    {
        [Required]
        public string TargetUser { get; set; } = string.Empty;
    }
}
