// Services/MetadataService.cs
using System;
using System.Net.Http;
using System.Threading.Tasks;
using HtmlAgilityPack;
using Microsoft.Extensions.Caching.Memory;

public class MetadataService
{
    private readonly IHttpClientFactory _factory;
    private readonly IMemoryCache _cache;

    public MetadataService(IHttpClientFactory factory, IMemoryCache cache)
    {
        _factory = factory;
        _cache = cache;
    }

    public async Task<(string? Title, string? ImageUrl)> GetMetadataAsync(string url)
    {
        try
        {
            var client = new HttpClient();
            client.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

            var html = await client.GetStringAsync(url);
            var doc = new HtmlDocument();
            doc.LoadHtml(html);

            // Try Open Graph tags first
            var title = doc.DocumentNode
                .SelectSingleNode("//meta[@property='og:title']")
                ?.GetAttributeValue("content", null);

            var image = doc.DocumentNode
                .SelectSingleNode("//meta[@property='og:image']")
                ?.GetAttributeValue("content", null);

            // Fallback to <title> tag if og:title is missing
            if (string.IsNullOrWhiteSpace(title))
            {
                title = doc.DocumentNode.SelectSingleNode("//title")?.InnerText;
            }

            return (title?.Trim(), image?.Trim());
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Metadata extraction failed: {ex.Message}");
            return (null, null);
        }
    }
}