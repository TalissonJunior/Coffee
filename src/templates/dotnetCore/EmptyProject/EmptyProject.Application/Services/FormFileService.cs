using EmptyProject.Domain.FileUpload;
using Microsoft.AspNetCore.Http;
using System;
using System.IO;

namespace EmptyProject.Application.Services
{
    public sealed class FormFileService : IFormFileService
    {
        public FileUpload Upload(IFormFile formFile,
           string absolutePath)
        {
            var filename = Guid.NewGuid().ToString();
            var ext = Path.GetExtension(formFile.FileName);
            var filenameWithExtension = filename + ext;

            var targetDirectory = Path.Combine(Directory.GetCurrentDirectory(),
                absolutePath);

            Directory.CreateDirectory(targetDirectory);

            var path = Path.Combine(targetDirectory, filenameWithExtension);

            using (var stream = new FileStream(path, FileMode.Create))
            {
                formFile.CopyTo(stream);
                var fileBytes = stream.Length;

                return new FileUpload(filename, fileBytes, ext);
            }
        }
    }
}
