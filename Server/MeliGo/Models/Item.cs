using Microsoft.EntityFrameworkCore;

namespace MeliGo.Models
{
    public class Item
    {
        public int Id { get; set; }
        public string Name { get; set; }   // can be empty if unknown at first
        [Precision(18, 2)]
        public decimal Price { get; set; } // 0 if unknown
        public string? ImageUrl { get; set; }
        public string Link { get; set; }   // ✅ Add this
        public DateTime DateAdded { get; set; }
        public int Importance { get; set; }  // 1 to 5
        public string Category { get; set; }

        public string UserId { get; set; }
        public virtual User User { get; set; } = null!;

        public int? HubId { get; set; }
        public virtual Hub? Hub { get; set; }
    }
}
