namespace MeliGo.Models.DTOs
{
    public class LinkDto
    {
        public string Link { get; set; } = string.Empty;
        public string? Title { get; set; }
        public string? ImageUrl { get; set; }
        public decimal? Price { get; set; }
        public string? PriceText { get; set; }
        public string? Currency { get; set; }
        public string? Brand { get; set; }
        public string? Description { get; set; }
        public string? Availability { get; set; }
        public string? Sku { get; set; }
        public string? SourceHost { get; set; }
        public string? PageTitle { get; set; }
        public string? ExtractedAt { get; set; }
        public List<string> ImageUrls { get; set; } = new();
    }
}
