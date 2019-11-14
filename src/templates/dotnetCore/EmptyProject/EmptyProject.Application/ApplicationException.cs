using System;

namespace EmptyProject.Application
{
    public class ApplicationException : Exception
    {
        internal ApplicationException(string businessMessage)
               : base(businessMessage)
        {
        }
    }
}
