using Microsoft.AspNetCore.Mvc;

public class HomeController : Controller
{
    public IActionResult Index()
    {
        return View();
    }

    public IActionResult GoToRoom()
    {
        // Điều hướng đến trang "Room"
        return RedirectToAction("Room");
    }

    public IActionResult Room()
    {
        // Trang Room
        return View();
    }
}