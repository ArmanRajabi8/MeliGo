using System.ComponentModel.DataAnnotations.Schema;

namespace MeliGo.Models
{
    public class Hub
    {
        public int Id { get; set; }
        public string Name { get; set; } = "Main cart";
        public string OwnerUserId { get; set; } = string.Empty;
        public bool IsDefault { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        [NotMapped]
        public int ItemCount { get; set; }

        public virtual List<Item> Items { get; set; } = new();
    }
}
