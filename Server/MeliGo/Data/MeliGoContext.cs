using MeliGo.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using MeliGo.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MeliGo.Data
{
    public class MeliGoContext : IdentityDbContext<User>
    {
        public MeliGoContext (DbContextOptions<MeliGoContext> options)
            : base(options)
        {
        }
        public DbSet<Picture> Pictures { get; set; } = default!;
        public DbSet<MeliGo.Models.Item> Item { get; set; } = default!;
        public DbSet<Item> Items { get; set; } = default!;

    }
}
