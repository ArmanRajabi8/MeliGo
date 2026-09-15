namespace MeliGo.Models
{
    public class Hub
    {
        public int Id { get; set; }
        public string Name { get; set; } = "Main cart";
        public string OwnerUserId { get; set; } = string.Empty;
        public bool IsDefault { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public virtual List<Item> Items { get; set; } = new();
    }
}
