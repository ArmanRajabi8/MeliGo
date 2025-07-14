using MeliGo.Data;
using MeliGo.Models;
using MeliGo.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// ✅ Local SQL Server (active)
builder.Services.AddDbContext<MeliGoContext>(options =>
{
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("MeliGoContext")
        ?? throw new InvalidOperationException("Connection string 'MeliGoContext' not found."));
    options.UseLazyLoadingProxies();
});

// 🧪 Optional: External PostgreSQL (comment this in to use)
// builder.Services.AddDbContext<MeliGoContext>(options =>
// {
//     options.UseNpgsql(
//         builder.Configuration.GetConnectionString("MeliGoContext")
//         ?? throw new InvalidOperationException("Connection string 'MeliGoContext' not found."));
//     options.UseLazyLoadingProxies();
// });

builder.Services.AddIdentity<User, IdentityRole>().AddEntityFrameworkStores<MeliGoContext>();

builder.Services.AddScoped<PictureService>();

builder.Services.Configure<IdentityOptions>(options =>
{
    options.Password.RequireDigit = false;
    options.Password.RequiredLength = 5;
    options.Password.RequireLowercase = false;
    options.Password.RequireUppercase = false;
    options.Password.RequireNonAlphanumeric = false;
});

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(options =>
{
    options.SaveToken = true;
    options.RequireHttpsMetadata = false;
    options.TokenValidationParameters = new TokenValidationParameters()
    {
        ValidateAudience = true,
        ValidateIssuer = true,
        ValidAudience = "http://localhost:4200",
        ValidIssuer = "https://localhost:7066",
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8
            .GetBytes("LooOOongue Phrase SiNoN Ça ne Marchera PaAaAAAaAas !"))
    };
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyHeader();
        policy.AllowAnyMethod();
        policy.AllowAnyOrigin();
    });
});

var app = builder.Build();

app.UseCors("AllowAll");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
