import Swal from 'sweetalert2';

/**
 * Show a success toast notification (top-end, auto-dismiss after 3s)
 */
export function showSuccessToast(title: string): void {
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'success',
    title: title,
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true
  });
}
