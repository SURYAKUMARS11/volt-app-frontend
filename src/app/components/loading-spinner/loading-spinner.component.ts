import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common'; // ✅ Add this

@Component({
  selector: 'app-loading-spinner',
  standalone: true, // ✅ If you're using standalone components
  imports: [CommonModule], // ✅ Import CommonModule here
  templateUrl: './loading-spinner.component.html',
  styleUrls: ['./loading-spinner.component.css']
})
export class LoadingSpinnerComponent {
  @Input() isLoading: boolean = false;
}
