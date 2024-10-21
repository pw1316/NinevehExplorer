namespace NinevehExplorer
{
    public static class Program
    {
        static void Main(string[] args)
        {
            Console.OpenStandardInput();
            Console.WriteLine("Hello, World!");
            var devices = SharpPcap.CaptureDeviceList.Instance;
            foreach (var dev in devices)
            {
                Console.WriteLine("{0}\n", dev.ToString());
            }
        }
    }
}