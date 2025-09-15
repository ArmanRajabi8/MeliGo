using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using MeliGo.Models;

namespace MeliGo.Data
{
    public class MeliGoContext : IdentityDbContext<User>
    {
        public MeliGoContext(DbContextOptions<MeliGoContext> options)
            : base(options) { }

        public DbSet<Picture> Pictures { get; set; } = default!;
        public DbSet<Item> Items { get; set; } = default!; // singular, no duplicates
    }
}
