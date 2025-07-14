using Microsoft.AspNetCore.Mvc;

namespace MeliGo.Models.DTOs
{
    public class ItemDTO
    {
        public string Name { get; set; }
        public decimal Price { get; set; }
        public string? ImageUrl { get; set; }
        public int Importance { get; set; }  // 1 to 5
        public string Category { get; set; }
    }

}
