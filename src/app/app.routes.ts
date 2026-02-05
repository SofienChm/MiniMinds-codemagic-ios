import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { featureGuard } from './core/guards/feature.guard';
import { noAuthGuard, landingGuard } from './core/guards/no-auth.guard';
import { FeatureCodes } from './core/interfaces/dto/tenant-dto';

// Role guards for routes
const ADMIN_ONLY = roleGuard('Admin');
const ADMIN_TEACHER = roleGuard('Admin', 'Teacher');
const SUPER_ADMIN_ONLY = roleGuard('SuperAdmin');

// Feature guards for optional features
const EVENTS_FEATURE = featureGuard(FeatureCodes.EVENTS);
const DAILY_ACTIVITIES_FEATURE = featureGuard(FeatureCodes.DAILY_ACTIVITIES);
const HOLIDAYS_FEATURE = featureGuard(FeatureCodes.HOLIDAYS);
const LEAVES_FEATURE = featureGuard(FeatureCodes.LEAVES);
const FEES_FEATURE = featureGuard(FeatureCodes.FEES);
const GALLERY_FEATURE = featureGuard(FeatureCodes.GALLERY);
const FOOD_MENU_FEATURE = featureGuard(FeatureCodes.FOOD_MENU);
const QR_CHECKIN_FEATURE = featureGuard(FeatureCodes.QR_CHECKIN);
const RECLAMATIONS_FEATURE = featureGuard(FeatureCodes.RECLAMATIONS);
const LEARNING_GAMES_FEATURE = featureGuard(FeatureCodes.LEARNING_GAMES);
const AI_ASSISTANT_FEATURE = featureGuard(FeatureCodes.AI_ASSISTANT);
const BASIC_AI_FEATURE = featureGuard(FeatureCodes.BASIC_AI);

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./features/landing/landing').then(m => m.Landing),
        canActivate: [landingGuard],
        pathMatch: 'full'
    },
    {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login').then(m => m.Login),
        canActivate: [noAuthGuard]
    },
    {
        path: 'register',
        loadComponent: () => import('./features/auth/register/register').then(m => m.Register),
        canActivate: [noAuthGuard]
    },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
    canActivate: [noAuthGuard]
  },
    {
        path: 'reset-password',
        loadComponent: () => import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
        canActivate: [noAuthGuard]
    },
    {
        path: 'request-demo',
        loadComponent: () => import('./features/request-demo/request-demo').then(m => m.RequestDemo)
    },
    {
        path: 'about',
        loadComponent: () => import('./features/about/about').then(m => m.About)
    },
    {
        path: 'terms-of-service',
        loadComponent: () => import('./features/legal/terms-of-service/terms-of-service').then(m => m.TermsOfService)
    },
    {
        path: 'privacy-policy',
        loadComponent: () => import('./features/legal/privacy-policy/privacy-policy').then(m => m.PrivacyPolicy)
    },
    // QR Action - Public route for deep linking (no auth guard, handles auth internally)
    {
        path: 'qr-action/:code',
        loadComponent: () => import('./features/qr-action/qr-action.component').then(m => m.QrActionComponent)
    },
  {
    path: '',
    loadComponent: () => import('./shared/layouts/main-layout/main-layout').then(m => m.MainLayout),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard)
      },
      // Parent routes - Admin & Teacher only
      {
        path: 'parents',
        loadComponent: () => import('./features/parent/parent').then(m => m.Parent),
        canActivate: [ADMIN_TEACHER]
      },
      {
        path: 'parents/add',
        loadComponent: () => import('./features/parent/add-parent/add-parent').then(m => m.AddParentComponent),
        canActivate: [ADMIN_TEACHER]
      },
      {
        path: 'parents/edit/:id',
        loadComponent: () => import('./features/parent/edit-parent/edit-parent').then(m => m.EditParent),
        canActivate: [ADMIN_TEACHER]
      },
      {
        path: 'parents/detail/:id',
        loadComponent: () => import('./features/parent/parent-detail/parent-detail').then(m => m.ParentDetail),
      },
      // Children routes - Admin & Teacher only
      {
        path: 'children',
        loadComponent: () => import('./features/children/children').then(m => m.Children),
        
      },
      {
        path: 'children/add',
        loadComponent: () => import('./features/children/add-children/add-children').then(m => m.AddChildren),
        canActivate: [ADMIN_TEACHER]
      },
      {
        path: 'children/edit/:id',
        loadComponent: () => import('./features/children/edit-children/edit-children').then(m => m.EditChildren),
      },
      {
        path: 'children/detail/:id',
        loadComponent: () => import('./features/children/child-detail/child-detail').then(m => m.ChildDetail),
      },
      {
        path: 'events',
        loadComponent: () => import('./features/event/event').then(m => m.Event),
        canActivate: [EVENTS_FEATURE]
      },
      {
        path: 'events/add',
        loadComponent: () => import('./features/event/add-event/add-event').then(m => m.AddEvent),
        canActivate: [ADMIN_TEACHER, EVENTS_FEATURE]
      },
      {
        path: 'events/edit/:id',
        loadComponent: () => import('./features/event/edit-event/edit-event').then(m => m.EditEvent),
        canActivate: [EVENTS_FEATURE]
      },
      {
        path: 'events/:id/participants',
        loadComponent: () => import('./features/event/event-participants/event-participants').then(m => m.EventParticipants),
        canActivate: [EVENTS_FEATURE]
      },
      {
        path: 'events/detail/:id',
        loadComponent: () => import('./features/event/event-detail/event-detail.component').then(m => m.EventDetailComponent),
        canActivate: [EVENTS_FEATURE]
      },
      {
        path: 'daily-activities',
        loadComponent: () => import('./features/daily-activities/daily-activities').then(m => m.DailyActivities),
        canActivate: [DAILY_ACTIVITIES_FEATURE]
      },
      {
        path: 'activities',
        loadComponent: () => import('./features/daily-activities/daily-activities').then(m => m.DailyActivities),
        canActivate: [DAILY_ACTIVITIES_FEATURE]
      },
      {
        path: 'activities/detail/:id',
        loadComponent: () => import('./features/daily-activities/activity-detail/activity-detail').then(m => m.ActivityDetail),
        canActivate: [DAILY_ACTIVITIES_FEATURE]
      },
      // Attendance routes - Admin & Teacher only
      {
        path: 'attendance',
        loadComponent: () => import('./features/attendance-sheet/attendance-sheet').then(m => m.AttendanceSheet),
        canActivate: [ADMIN_TEACHER]
      },
      {
        path: 'attendance-list',
        loadComponent: () => import('./features/attendance-sheet/attendance-list/attendance-list').then(m => m.AttendanceList),
        canActivate: [ADMIN_TEACHER]
      },
      {
        path: 'calendar',
        loadComponent: () => import('./features/calendar/calendar.component').then(m => m.CalendarPageComponent)
      },
      {
        path: 'holidays',
        loadComponent: () => import('./features/holiday/holiday.component').then(m => m.HolidayComponent),
        canActivate: [ADMIN_TEACHER, HOLIDAYS_FEATURE]
      },
      {
        path: 'holidays/add',
        loadComponent: () => import('./features/holiday/add-holiday/add-holiday.component').then(m => m.AddHolidayComponent),
        canActivate: [HOLIDAYS_FEATURE]
      },
      {
        path: 'holidays/edit/:id',
        loadComponent: () => import('./features/holiday/edit-holiday/edit-holiday.component').then(m => m.EditHolidayComponent),
        canActivate: [HOLIDAYS_FEATURE]
      },
      // Leaves routes - Admin & Teacher only
      {
        path: 'leaves',
        loadComponent: () => import('./features/leaves/leaves').then(m => m.Leaves),
        canActivate: [ADMIN_TEACHER, LEAVES_FEATURE]
      },
      {
        path: 'leaves/add',
        loadComponent: () => import('./features/leaves/add-leave').then(m => m.AddLeave),
        canActivate: [ADMIN_TEACHER, LEAVES_FEATURE]
      },
      {
        path: 'fees',
        loadComponent: () => import('./features/fee/fee.component').then(m => m.FeeComponent),
        canActivate: [FEES_FEATURE]
      },
      {
        path: 'fees/add',
        loadComponent: () => import('./features/fee/add-fee/add-fee.component').then(m => m.AddFeeComponent),
        canActivate: [FEES_FEATURE]
      },
      {
        path: 'fees/edit/:id',
        loadComponent: () => import('./features/fee/fee-edit/fee-edit.component').then(m => m.FeeEditComponent),
        canActivate: [FEES_FEATURE]
      },
      {
        path: 'fees/detail/:id',
        loadComponent: () => import('./features/fee/fee-detail/fee-detail.component').then(m => m.FeeDetailComponent),
        canActivate: [FEES_FEATURE]
      },
      // Educator routes - Admin & Teacher only
      {
        path: 'educators',
        loadComponent: () => import('./features/educator/educator').then(m => m.Educator),
        canActivate: [ADMIN_TEACHER]
      },
      {
        path: 'educators/add',
        loadComponent: () => import('./features/educator/add-educator/add-educator').then(m => m.AddEducator),
        canActivate: [ADMIN_TEACHER]
      },
      {
        path: 'educators/edit/:id',
        loadComponent: () => import('./features/educator/edit-educator/edit-educator').then(m => m.EditEducator),
        canActivate: [ADMIN_TEACHER]
      },
      {
        path: 'educators/detail/:id',
        loadComponent: () => import('./features/educator/educator-detail/educator-detail').then(m => m.EducatorDetail),
        canActivate: [ADMIN_TEACHER]
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/edit-profile/edit-profile').then(m => m.EditProfile)
      },
      {
        path: 'basic-ai',
        loadComponent: () => import('./features/basic-ai/basic-ai.component').then(m => m.BasicAIComponent),
        canActivate: [BASIC_AI_FEATURE]
      },
      {
        path: 'ai-assistant',
        loadComponent: () => import('./features/ai-assistant/ai-assistant.component').then(m => m.AIAssistantComponent),
        canActivate: [AI_ASSISTANT_FEATURE]
      },
      {
        path: 'messages',
        loadComponent: () => import('./features/messages/messages.component').then(m => m.MessagesComponent)
      },
      {
        path: 'profile/edit',
        loadComponent: () => import('./features/profile/edit-profile/edit-profile').then(m => m.EditProfile)
      },
      // Settings - Admin & Teacher only
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent),
        canActivate: [ADMIN_TEACHER]
      },
      // Classes routes - Admin & Teacher only
      {
        path: 'classes',
        loadComponent: () => import('./features/classes/classes.component').then(m => m.ClassesComponent),
        canActivate: [ADMIN_TEACHER]
      },
      {
        path: 'classes/add',
        loadComponent: () => import('./features/classes/add-class/add-class.component').then(m => m.AddClassComponent),
        canActivate: [ADMIN_TEACHER]
      },
      {
        path: 'classes/detail/:id',
        loadComponent: () => import('./features/classes/class-detail/class-detail.component').then(m => m.ClassDetailComponent),
        canActivate: [ADMIN_TEACHER]
      },
      {
        path: 'learning-games',
        loadComponent: () => import('./features/learning-games/learning-games.component').then(m => m.LearningGamesComponent),
        canActivate: [LEARNING_GAMES_FEATURE]
      },
      {
        path: 'reclamations',
        loadComponent: () => import('./features/reclamations/reclamations.component').then(m => m.ReclamationsComponent),
        canActivate: [RECLAMATIONS_FEATURE]
      },
      // Appointments routes - All authenticated users
      {
        path: 'appointments',
        loadComponent: () => import('./features/appointments/appointments').then(m => m.Appointments)
      },
      {
        path: 'appointments/add',
        loadComponent: () => import('./features/appointments/add-appointment/add-appointment').then(m => m.AddAppointment),
        canActivate: [roleGuard('Parent')]
      },
      {
        path: 'appointments/edit/:id',
        loadComponent: () => import('./features/appointments/edit-appointment/edit-appointment').then(m => m.EditAppointment),
        canActivate: [roleGuard('Parent')]
      },
      {
        path: 'appointments/detail/:id',
        loadComponent: () => import('./features/appointments/appointment-detail/appointment-detail').then(m => m.AppointmentDetail)
      },
      // Static Fees routes - Admin & Teacher only (for tracking offline payments)
      {
        path: 'static-fees',
        loadComponent: () => import('./features/static-fees/static-fees').then(m => m.StaticFeesComponent),
        canActivate: [ADMIN_TEACHER, FEES_FEATURE]
      },
      {
        path: 'static-fees/add',
        loadComponent: () => import('./features/static-fees/add-static-fee/add-static-fee').then(m => m.AddStaticFeeComponent),
        canActivate: [ADMIN_TEACHER, FEES_FEATURE]
      },
      {
        path: 'gallery',
        loadComponent: () => import('./features/gallery/gallery').then(m => m.Gallery),
        canActivate: [GALLERY_FEATURE]
      },
      {
        path: 'food-menu',
        loadComponent: () => import('./features/food-menu/food-menu.component').then(m => m.FoodMenuComponent),
        canActivate: [FOOD_MENU_FEATURE]
      },
      {
        path: 'food-menu/add',
        loadComponent: () => import('./features/food-menu/add-menu/add-menu.component').then(m => m.AddMenuComponent),
        canActivate: [FOOD_MENU_FEATURE]
      },
      {
        path: 'food-menu/edit/:id',
        loadComponent: () => import('./features/food-menu/add-menu/add-menu.component').then(m => m.AddMenuComponent),
        canActivate: [FOOD_MENU_FEATURE]
      },
      {
        path: 'food-menu/food-items',
        loadComponent: () => import('./features/food-menu/food-items/food-items.component').then(m => m.FoodItemsComponent),
        canActivate: [FOOD_MENU_FEATURE]
      },
      {
        path: 'food-menu/parent',
        loadComponent: () => import('./features/food-menu/parent-menu-view/parent-menu-view.component').then(m => m.ParentMenuViewComponent),
        canActivate: [FOOD_MENU_FEATURE]
      },
      {
        path: 'food-menu/detail/:id',
        loadComponent: () => import('./features/food-menu/menu-detail/menu-detail.component').then(m => m.MenuDetailComponent),
        canActivate: [FOOD_MENU_FEATURE]
      },
      {
        path: 'food-menu/report/:id',
        loadComponent: () => import('./features/food-menu/menu-report/menu-report.component').then(m => m.MenuReportComponent),
        canActivate: [FOOD_MENU_FEATURE]
      },
      {
        path: 'notifications',
        loadComponent: () => import('./features/notifications/notifications.component').then(m => m.NotificationsComponent)
      },
      {
        path: 'notification-settings',
        loadComponent: () => import('./features/notification-settings/notification-settings.component').then(m => m.NotificationSettingsComponent)
      },
      {
        path: 'profile-menu',
        loadComponent: () => import('./features/profile-menu/profile-menu.component').then(m => m.ProfileMenuComponent)
      },
      {
        path: 'qr-checkin',
        loadComponent: () => import('./features/qr-checkin/qr-checkin').then(m => m.QrCheckin),
        canActivate: [QR_CHECKIN_FEATURE]
      },
      // QR Management - Admin & Teacher only
      {
        path: 'qr-management',
        loadComponent: () => import('./features/qr-management/qr-management').then(m => m.QrManagement),
        canActivate: [ADMIN_TEACHER, QR_CHECKIN_FEATURE]
      },
      {
        path: 'base-ui',
        loadComponent: () => import('./features/base-ui/base-ui').then(m => m.BaseUi)
      },
      // SuperAdmin routes
      {
        path: 'super-admin/dashboard',
        loadComponent: () => import('./features/super-admin/dashboard/super-admin-dashboard').then(m => m.SuperAdminDashboard),
        canActivate: [SUPER_ADMIN_ONLY]
      },
      {
        path: 'super-admin/tenants',
        loadComponent: () => import('./features/super-admin/tenants/tenants').then(m => m.Tenants),
        canActivate: [SUPER_ADMIN_ONLY]
      },
      {
        path: 'super-admin/tenants/add',
        loadComponent: () => import('./features/super-admin/tenants/add-tenant/add-tenant').then(m => m.AddTenant),
        canActivate: [SUPER_ADMIN_ONLY]
      },
      {
        path: 'super-admin/tenants/edit/:id',
        loadComponent: () => import('./features/super-admin/tenants/add-tenant/add-tenant').then(m => m.AddTenant),
        canActivate: [SUPER_ADMIN_ONLY]
      },
      {
        path: 'super-admin/tenants/detail/:id',
        loadComponent: () => import('./features/super-admin/tenants/tenant-detail/tenant-detail').then(m => m.TenantDetail),
        canActivate: [SUPER_ADMIN_ONLY]
      },
      {
        path: 'super-admin/tenants/:id/features',
        loadComponent: () => import('./features/super-admin/tenants/tenant-features/tenant-features').then(m => m.TenantFeatures),
        canActivate: [SUPER_ADMIN_ONLY]
      },
      // SuperAdmin Billing routes
      {
        path: 'super-admin/billing',
        loadComponent: () => import('./features/super-admin/billing/billing').then(m => m.Billing),
        canActivate: [SUPER_ADMIN_ONLY]
      },
      {
        path: 'super-admin/billing/:id',
        loadComponent: () => import('./features/super-admin/billing/billing-detail/billing-detail').then(m => m.BillingDetail),
        canActivate: [SUPER_ADMIN_ONLY]
      },
      // SuperAdmin Demo Requests
      {
        path: 'super-admin/demo-requests',
        loadComponent: () => import('./features/super-admin/demo-requests/demo-requests').then(m => m.DemoRequests),
        canActivate: [SUPER_ADMIN_ONLY]
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
    {
        path: '404',
        loadComponent: () => import('./features/not-found/not-found.component').then(m => m.NotFoundComponent)
    },
    {
        path: '403',
        loadComponent: () => import('./features/forbidden/forbidden.component').then(m => m.ForbiddenComponent)
    },
    {
        path: '500',
        loadComponent: () => import('./features/forbidden/forbidden.component').then(m => m.ForbiddenComponent)
    },
    {
        path: '**',
        loadComponent: () => import('./features/not-found/not-found.component').then(m => m.NotFoundComponent)
    }
];
