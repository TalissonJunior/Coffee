using EmptyProject.Domain.FileUpload;
using Microsoft.AspNetCore.Http;

namespace EmptyProject.Application.Services
{
    public interface IFormFileService
    {
        FileUpload Upload(IFormFile formFile,
           string absolutePath);
    }
}
