namespace MeliGo.Models
{
    public class ListShare
    {
        public int Id { get; set; }
        public string OwnerUserId { get; set; } = string.Empty;
        public string SharedWithUserId { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
