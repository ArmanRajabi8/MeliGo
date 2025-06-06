using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MeliGo.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;

namespace MeliGo.Data
{
    public class MeliGoContext : IdentityDbContext<User>
    {
        public MeliGoContext (DbContextOptions<MeliGoContext> options)
            : base(options)
        {
        }

        public DbSet<MeliGo.Models.Item> Item { get; set; } = default!;
    }
}
