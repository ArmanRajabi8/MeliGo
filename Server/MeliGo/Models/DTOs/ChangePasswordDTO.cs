using System.ComponentModel.DataAnnotations;


    public class ChangePasswordDTO
    {
        [Required]
        public string OldPassword { get; set; } = null!;

        [Required]
        public string NewPassword { get; set; } = null!;

        [Required]
        public string NewPasswordConfirm { get; set; } = null!;
    }
