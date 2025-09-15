using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;

namespace MeliGo.Models.DTOs
{
    public class ItemCreateDto
    {
        [Required]
        public string Name { get; set; }

        [Required]
        [Url]
        public string Link { get; set; }

        [Range(0, double.MaxValue)]
        public decimal Price { get; set; }

        [Url]
        public string? ImageUrl { get; set; }

        public string? Category { get; set; }
        public int Importance { get; set; } = 1;
    }
}