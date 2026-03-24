using MeliGo.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace MeliGo
{
    public class MeliGoContextFactory : IDesignTimeDbContextFactory<MeliGoContext>
    {
        public MeliGoContext CreateDbContext(string[] args)
        {
            var environmentName = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development";

            var config = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json")
                .AddJsonFile($"appsettings.{environmentName}.json", optional: true)
                .Build();

            var optionsBuilder = new DbContextOptionsBuilder<MeliGoContext>();
            var connectionString = config.GetConnectionString("MeliGoContext");

            optionsBuilder.UseSqlServer(connectionString);
            optionsBuilder.UseLazyLoadingProxies();

            return new MeliGoContext(optionsBuilder.Options);
        }
    }
}
