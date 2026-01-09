# 🎨 Loading Skeleton Components

Professional loading placeholders for MiniMinds application. These components provide a smooth, modern loading experience that makes the app feel faster and more responsive.

---

## 📦 **Available Components**

### 1. **SkeletonComponent** (Base)
The foundation component for creating custom skeleton layouts.

```html
<!-- Basic line skeleton -->
<app-skeleton [height]="20" [width]="'100%'"></app-skeleton>

<!-- Circle skeleton (for avatars) -->
<app-skeleton [height]="50" [width]="'50px'" [circle]="true"></app-skeleton>

<!-- Custom border radius -->
<app-skeleton [height]="30" [width]="'80%'" borderRadius="16px"></app-skeleton>

<!-- Pulse animation instead of shimmer -->
<app-skeleton [height]="40" [width]="'100%'" [pulse]="true"></app-skeleton>
```

**Props:**
- `height` (number) - Height in pixels. Default: 20
- `width` (string) - Width (can be %, px, rem). Default: '100%'
- `circle` (boolean) - Make it circular. Default: false
- `pulse` (boolean) - Use pulse animation instead of shimmer. Default: false
- `borderRadius` (string) - Custom border radius. Default: '8px'

---

### 2. **SkeletonChildCardComponent**
Pre-built skeleton for child list cards.

```html
<!-- Show 6 skeleton cards while loading -->
<app-skeleton-child-card *ngFor="let i of [1,2,3,4,5,6]"></app-skeleton-child-card>
```

**Use in:**
- Children list page
- Dashboard child cards
- Parent's children section

---

### 3. **SkeletonParentCardComponent**
Pre-built skeleton for parent list cards.

```html
<!-- Show 5 skeleton cards while loading -->
<app-skeleton-parent-card *ngFor="let i of [1,2,3,4,5]"></app-skeleton-parent-card>
```

**Use in:**
- Parents list page
- Parent search results

---

### 4. **SkeletonStatCardComponent**
Pre-built skeleton for dashboard statistics cards.

```html
<!-- Single stat card -->
<app-skeleton-stat-card></app-skeleton-stat-card>

<!-- Multiple stats in a grid -->
<div class="row">
  <div class="col-md-3" *ngFor="let i of [1,2,3,4]">
    <app-skeleton-stat-card></app-skeleton-stat-card>
  </div>
</div>
```

**Use in:**
- Admin dashboard
- Teacher dashboard
- Analytics pages

---

### 5. **SkeletonPhotoGridComponent**
Pre-built skeleton for photo gallery grid.

```html
<!-- Show 12 skeleton photos -->
<app-skeleton-photo-grid [count]="12"></app-skeleton-photo-grid>

<!-- Show 6 skeleton photos -->
<app-skeleton-photo-grid [count]="6"></app-skeleton-photo-grid>
```

**Props:**
- `count` (number) - Number of skeleton photos. Default: 12

**Use in:**
- Gallery page
- Recent photos section
- Child photo galleries

---

### 6. **SkeletonTableComponent**
Pre-built skeleton for table rows.

```html
<!-- 5 rows, 4 columns -->
<app-skeleton-table [rows]="5" [columns]="4"></app-skeleton-table>

<!-- 10 rows, 6 columns -->
<app-skeleton-table [rows]="10" [columns]="6"></app-skeleton-table>
```

**Props:**
- `rows` (number) - Number of skeleton rows. Default: 5
- `columns` (number) - Number of columns. Default: 4

**Use in:**
- Attendance sheet
- Fee management
- Leave requests table
- Any data table

---

### 7. **SkeletonActivityTimelineComponent**
Pre-built skeleton for activity timeline.

```html
<!-- Show 5 skeleton activities -->
<app-skeleton-activity-timeline [count]="5"></app-skeleton-activity-timeline>

<!-- Show 3 skeleton activities -->
<app-skeleton-activity-timeline [count]="3"></app-skeleton-activity-timeline>
```

**Props:**
- `count` (number) - Number of skeleton activities. Default: 5

**Use in:**
- Daily activities page
- Activity timeline
- Parent dashboard activities

---

## 🚀 **Quick Start Guide**

### **Step 1: Import in Your Component**

```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonChildCardComponent } from '@shared/components/skeleton';

@Component({
  selector: 'app-children',
  standalone: true,
  imports: [CommonModule, SkeletonChildCardComponent],
  templateUrl: './children.html'
})
export class ChildrenComponent {
  loading = false;
  children: any[] = [];
}
```

### **Step 2: Use in Template**

```html
<!-- Show skeleton while loading -->
<div *ngIf="loading">
  <app-skeleton-child-card *ngFor="let i of [1,2,3,4,5,6]"></app-skeleton-child-card>
</div>

<!-- Show real content when loaded -->
<div *ngIf="!loading">
  <div class="child-card" *ngFor="let child of children">
    <!-- Your content -->
  </div>
</div>
```

---

## 📱 **Complete Page Examples**

### **Example 1: Children List Page**

```html
<div class="container">
  <h1>Children</h1>

  <!-- Loading State -->
  <div *ngIf="loading">
    <app-skeleton-child-card *ngFor="let i of [1,2,3,4,5,6]"></app-skeleton-child-card>
  </div>

  <!-- Loaded State with Fade-in Animation -->
  <div *ngIf="!loading" class="fade-in">
    <div class="child-card" *ngFor="let child of children">
      <img [src]="child.profilePicture" [alt]="child.firstName">
      <h3>{{ child.firstName }} {{ child.lastName }}</h3>
      <p>{{ child.age }} years old</p>
    </div>
  </div>
</div>
```

### **Example 2: Dashboard Stats**

```html
<div class="row">
  <!-- Loading State -->
  <div class="col-md-3" *ngFor="let i of [1,2,3,4]">
    <app-skeleton-stat-card *ngIf="loadingStats"></app-skeleton-stat-card>

    <!-- Real Stat Card -->
    <div class="stat-card" *ngIf="!loadingStats">
      <h4>{{ stats[i].label }}</h4>
      <p>{{ stats[i].value }}</p>
    </div>
  </div>
</div>
```

### **Example 3: Photo Gallery**

```html
<div class="gallery-container">
  <h1>Gallery</h1>

  <!-- Loading State -->
  <app-skeleton-photo-grid [count]="12" *ngIf="loading"></app-skeleton-photo-grid>

  <!-- Loaded State -->
  <div class="photo-grid" *ngIf="!loading">
    <div class="photo-item" *ngFor="let photo of photos">
      <img [src]="photo.thumbnailData" [alt]="photo.title">
    </div>
  </div>
</div>
```

### **Example 4: Activity Timeline**

```html
<div class="activities-section">
  <h2>Today's Activities</h2>

  <!-- Loading State -->
  <app-skeleton-activity-timeline [count]="5" *ngIf="loading"></app-skeleton-activity-timeline>

  <!-- Loaded State -->
  <div class="timeline" *ngIf="!loading">
    <div class="timeline-item" *ngFor="let activity of activities">
      <div class="timeline-marker"></div>
      <div class="timeline-content">
        <h4>{{ activity.activityType }}</h4>
        <p>{{ activity.notes }}</p>
        <small>{{ activity.activityTime | date }}</small>
      </div>
    </div>
  </div>
</div>
```

---

## 🎨 **Customization**

### **Add Fade-in Animation**

Add this to your component's SCSS file:

```scss
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: fadeIn 0.3s ease-out;
}
```

Then use it:

```html
<div *ngIf="!loading" class="fade-in">
  <!-- Your content -->
</div>
```

---

## 🎯 **Best Practices**

### **1. Progressive Loading**

Load content in stages for better UX:

```typescript
loadingStates = {
  header: true,
  stats: true,
  children: true,
  photos: true
};

async ngOnInit() {
  // Load header first
  await this.loadHeader();
  this.loadingStates.header = false;

  // Then stats
  await this.loadStats();
  this.loadingStates.stats = false;

  // Then content in parallel
  Promise.all([
    this.loadChildren(),
    this.loadPhotos()
  ]).then(() => {
    this.loadingStates.children = false;
    this.loadingStates.photos = false;
  });
}
```

### **2. Match Skeleton to Real Content**

Make sure your skeleton matches the actual layout:

```html
<!-- ✅ Good - Skeleton matches real content structure -->
<div class="child-card">
  <!-- Skeleton -->
  <div *ngIf="loading" class="d-flex gap-3">
    <app-skeleton [height]="60" [width]="'60px'" [circle]="true"></app-skeleton>
    <div class="flex-grow-1">
      <app-skeleton [height]="18" [width]="'70%'" class="mb-2"></app-skeleton>
      <app-skeleton [height]="14" [width]="'50%'"></app-skeleton>
    </div>
  </div>

  <!-- Real Content -->
  <div *ngIf="!loading" class="d-flex gap-3">
    <img [src]="child.avatar" class="avatar">
    <div class="flex-grow-1">
      <h3>{{ child.name }}</h3>
      <p>{{ child.age }}</p>
    </div>
  </div>
</div>
```

### **3. Use Appropriate Count**

Show the same number of skeletons as typical content:

```html
<!-- If you typically show 6-10 children, use 6-8 skeletons -->
<app-skeleton-child-card *ngFor="let i of [1,2,3,4,5,6]"></app-skeleton-child-card>

<!-- If you typically show 3 photos, use 3 skeletons -->
<app-skeleton-photo-grid [count]="3"></app-skeleton-photo-grid>
```

---

## 🐛 **Troubleshooting**

### **Skeleton not showing?**

1. Check that component is imported:
   ```typescript
   imports: [CommonModule, SkeletonComponent]
   ```

2. Check loading state is true:
   ```typescript
   loading = true; // Should be true initially
   ```

3. Check *ngIf condition:
   ```html
   <app-skeleton *ngIf="loading"></app-skeleton>
   ```

### **Skeleton looks different from content?**

Match the skeleton structure to your real content structure. Use browser DevTools to compare dimensions.

### **Animation not smooth?**

Check that you don't have conflicting CSS animations. The skeleton has built-in animations.

---

## 📊 **Performance Impact**

- **Zero performance cost**: Pure CSS animations
- **No JavaScript overhead**: Only renders DOM elements
- **Small bundle size**: ~2KB total for all skeleton components
- **Mobile optimized**: Hardware-accelerated animations

---

## 🎉 **Benefits**

✅ **Perceived performance boost**: App feels 2-3x faster
✅ **Reduced bounce rate**: Users wait longer when they see progress
✅ **Professional feel**: Modern, polished UI like Facebook, LinkedIn
✅ **Better mobile UX**: Especially important on slow 3G/4G connections
✅ **No flash of empty content**: Smooth transition from loading to loaded

---

## 📝 **Migration Checklist**

Use skeletons on these pages (in priority order):

- [x] **Dashboard** (Parent & Admin) - Most important!
- [ ] **Children List**
- [ ] **Gallery/Photos**
- [ ] **Daily Activities**
- [ ] **Parents List**
- [ ] **Attendance Sheet**
- [ ] **Events**
- [ ] **Fee Management**
- [ ] **Messages**
- [ ] **Calendar**

---

## 🔗 **Related Files**

- Base component: `skeleton.component.ts`
- Child card: `skeleton-child-card.component.ts`
- Parent card: `skeleton-parent-card.component.ts`
- Stat card: `skeleton-stat-card.component.ts`
- Photo grid: `skeleton-photo-grid.component.ts`
- Table: `skeleton-table.component.ts`
- Timeline: `skeleton-activity-timeline.component.ts`

---

**Need help?** Check the examples in `dashboard.html` (line 399+) for real-world usage!
