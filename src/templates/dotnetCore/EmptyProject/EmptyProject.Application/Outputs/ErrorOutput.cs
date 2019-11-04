namespace EmptyProject.Application.Outputs
{
    public sealed class ErrorOutput
    {
        public ErrorOutput(string code, string message)
        {
            Code = code;
            Message = message;
        }

        public string Code { get; set; }
        public string Message { get; set; }
    }
}
