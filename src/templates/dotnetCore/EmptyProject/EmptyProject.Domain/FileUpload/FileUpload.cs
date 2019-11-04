using System;

namespace EmptyProject.Domain.FileUpload
{
    public sealed class FileUpload
    {
        public Guid Id { get; private set; }
        public string Name { get; private set; }
        public float Size { get; private set; }
        public string Extension { get; private set; }

        public FileUpload(string name,
            float size,
            string extension)
        {
            Id = Guid.NewGuid();
            Name = name;
            Size = size;
            Extension = extension;
        }
    }
}
