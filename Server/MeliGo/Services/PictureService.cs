using MeliGo.Data;
using Microsoft.AspNetCore.Mvc;
using Picture = MeliGo.Models.Picture;

namespace MeliGo.Services
{
    public class PictureService
    {
        private readonly MeliGoContext _context;

        public PictureService(MeliGoContext context)
        {
            _context = context;
        }
        public async Task<Picture?> PostPicture(Picture picture)
        {
           _context.Pictures.Add(picture);
            await _context.SaveChangesAsync();
            return picture;
        }

        public async Task<Picture?> GetPicture(int id)
        {
            Picture? picture = await _context.Pictures.FindAsync(id);
            return picture;
        }

        public async Task<Picture?> DeletePicture(int id, Picture picture)
        {
            _context.Pictures.Remove(picture);
            await _context.SaveChangesAsync();
            return picture;
        }


        public async Task DeletePictures(List<Picture> pictures)
        {
            foreach (var picture in pictures)
            {
                var fullPath = Path.Combine(Directory.GetCurrentDirectory(), "images", "full", picture.FileName);
                var thumbPath = Path.Combine(Directory.GetCurrentDirectory(), "images", "thumbnail", picture.FileName);

                if (File.Exists(fullPath)) File.Delete(fullPath);
                if (File.Exists(thumbPath)) File.Delete(thumbPath);
                _context.Pictures.Remove(picture);
            }

            await _context.SaveChangesAsync();
        }

        private bool IsContextNull() => _context == null || _context.Pictures == null;
    }
}