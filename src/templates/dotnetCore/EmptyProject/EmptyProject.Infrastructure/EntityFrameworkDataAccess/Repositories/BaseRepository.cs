using AutoMapper;
using EmptyProject.Infrastructure.EntityFrameworkDataAccess.Mappings;

namespace EmptyProject.Infrastructure.EntityFrameworkDataAccess.Repositories
{
    public class BaseRepository
    {
        public readonly IMapper iMapper;
        public BaseRepository()
        {
            if (iMapper == null)
            {
                var config = new MapperConfiguration(cfg =>
                {
                    cfg.AddProfile<MappingProfile>();
                });

                iMapper = config.CreateMapper();
            }

        }
    }
}
