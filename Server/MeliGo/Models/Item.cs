namespace MeliGo.Models
{
    public class Item
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public decimal Price { get; set; }
        public string? ImageUrl { get; set; }
        public DateTime DateAdded { get; set; }
        public int Importance { get; set; }  // 1 to 5
        public string Category { get; set; }

        public string UserId { get; set; }
        public virtual User User { get; set; }
    }

}
