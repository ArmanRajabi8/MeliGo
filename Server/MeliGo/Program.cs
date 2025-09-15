using MeliGo.Data;
using MeliGo.Models;
using MeliGo.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
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
// After builder.Services.AddSwaggerGen();
builder.Services.AddSwaggerGen(c =>
{
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter ‘Bearer {your JWT}’"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
  {
    {
      new OpenApiSecurityScheme { Reference = new OpenApiReference {
          Type = ReferenceType.SecurityScheme,
          Id   = "Bearer"
        }
      },
      new string[] {}
    }
  });
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyHeader();
        policy.AllowAnyMethod();
        policy.AllowAnyOrigin();
    });
});

builder.Services.AddScoped<MetadataService>();

builder.Services.AddMemoryCache();

builder.Services.AddHttpClient("MetadataClient", client =>
{
    client.Timeout = TimeSpan.FromSeconds(5);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("MeliGoBot/1.0");
});
var app = builder.Build();

app.UseCors("AllowAll");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI(c =>
        {
            // point to the generated JSON and give your API a name
            c.SwaggerEndpoint("/swagger/v1/swagger.json", "MeliGo API V1");

            // serve the Swagger UI at the app's root (http://localhost:<port>/)
            c.RoutePrefix = string.Empty;
        });
    }
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
