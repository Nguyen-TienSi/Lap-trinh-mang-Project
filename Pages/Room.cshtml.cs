using Microsoft.AspNetCore.Mvc.RazorPages;

namespace VideoCallApp.Pages
{
    public class RoomModel : PageModel
    {
        public string RoomId { get; set; }

        public void OnGet(string roomId)
        {
            RoomId = roomId;
        }
    }
}