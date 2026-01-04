import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login').then(m => m.Login)
    },
    {
        path: 'register',
        loadComponent: () => import('./features/auth/register/register').then(m => m.Register)
    },
    {
        path: 'reset-password',
        loadComponent: () => import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
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
      {
        path: 'parents',
        loadComponent: () => import('./features/parent/parent').then(m => m.Parent)
      },
      {
        path: 'parents/add',
        loadComponent: () => import('./features/parent/add-parent/add-parent').then(m => m.AddParentComponent)
      },
      {
        path: 'parents/edit/:id',
        loadComponent: () => import('./features/parent/edit-parent/edit-parent').then(m => m.EditParent)
      },
      {
        path: 'parents/detail/:id',
        loadComponent: () => import('./features/parent/parent-detail/parent-detail').then(m => m.ParentDetail)
      },
      {
        path: 'children',
        loadComponent: () => import('./features/children/children').then(m => m.Children)
      },
      {
        path: 'children/add',
        loadComponent: () => import('./features/children/add-children/add-children').then(m => m.AddChildren)
      },
      {
        path: 'children/edit/:id',
        loadComponent: () => import('./features/children/edit-children/edit-children').then(m => m.EditChildren)
      },
      {
        path: 'children/detail/:id',
        loadComponent: () => import('./features/children/child-detail/child-detail').then(m => m.ChildDetail)
      },
      {
        path: 'events',
        loadComponent: () => import('./features/event/event').then(m => m.Event)
      },
      {
        path: 'events/add',
        loadComponent: () => import('./features/event/add-event/add-event').then(m => m.AddEvent)
      },
      {
        path: 'events/edit/:id',
        loadComponent: () => import('./features/event/edit-event/edit-event').then(m => m.EditEvent)
      },
      {
        path: 'events/:id/participants',
        loadComponent: () => import('./features/event/event-participants/event-participants').then(m => m.EventParticipants)
      },
      {
        path: 'events/detail/:id',
        loadComponent: () => import('./features/event/event-detail/event-detail.component').then(m => m.EventDetailComponent)
      },
      {
        path: 'daily-activities',
        loadComponent: () => import('./features/daily-activities/daily-activities').then(m => m.DailyActivities)
      },
      {
        path: 'activities',
        loadComponent: () => import('./features/daily-activities/daily-activities').then(m => m.DailyActivities)
      },
      {
        path: 'activities/detail/:id',
        loadComponent: () => import('./features/daily-activities/activity-detail/activity-detail').then(m => m.ActivityDetail)
      },
      {
        path: 'attendance',
        loadComponent: () => import('./features/attendance-sheet/attendance-sheet').then(m => m.AttendanceSheet)
      },
      {
        path: 'calendar',
        loadComponent: () => import('./features/calendar/calendar.component').then(m => m.CalendarPageComponent)
      },
      {
        path: 'holidays',
        loadComponent: () => import('./features/holiday/holiday.component').then(m => m.HolidayComponent)
      },
      {
        path: 'holidays/add',
        loadComponent: () => import('./features/holiday/add-holiday/add-holiday.component').then(m => m.AddHolidayComponent)
      },
      {
        path: 'holidays/edit/:id',
        loadComponent: () => import('./features/holiday/edit-holiday/edit-holiday.component').then(m => m.EditHolidayComponent)
      },
      {
        path: 'leaves',
        loadComponent: () => import('./features/leaves/leaves').then(m => m.Leaves)
      },
      {
        path: 'leaves/add',
        loadComponent: () => import('./features/leaves/add-leave').then(m => m.AddLeave)
      },
      {
        path: 'fees',
        loadComponent: () => import('./features/fee/fee.component').then(m => m.FeeComponent)
      },
      {
        path: 'fees/add',
        loadComponent: () => import('./features/fee/add-fee/add-fee.component').then(m => m.AddFeeComponent)
      },
      {
        path: 'fees/edit/:id',
        loadComponent: () => import('./features/fee/fee-edit/fee-edit.component').then(m => m.FeeEditComponent)
      },
      {
        path: 'fees/detail/:id',
        loadComponent: () => import('./features/fee/fee-detail/fee-detail.component').then(m => m.FeeDetailComponent)
      },
      {
        path: 'educators',
        loadComponent: () => import('./features/educator/educator').then(m => m.Educator)
      },
      {
        path: 'educators/add',
        loadComponent: () => import('./features/educator/add-educator/add-educator').then(m => m.AddEducator)
      },
      {
        path: 'educators/edit/:id',
        loadComponent: () => import('./features/educator/edit-educator/edit-educator').then(m => m.EditEducator)
      },
      {
        path: 'educators/detail/:id',
        loadComponent: () => import('./features/educator/educator-detail/educator-detail').then(m => m.EducatorDetail)
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/edit-profile/edit-profile').then(m => m.EditProfile)
      },
      {
        path: 'basic-ai',
        loadComponent: () => import('./features/basic-ai/basic-ai.component').then(m => m.BasicAIComponent)
      },
      {
        path: 'ai-assistant',
        loadComponent: () => import('./features/ai-assistant/ai-assistant.component').then(m => m.AIAssistantComponent)
      },
      {
        path: 'messages',
        loadComponent: () => import('./features/messages/messages.component').then(m => m.MessagesComponent)
      },
      {
        path: 'profile/edit',
        loadComponent: () => import('./features/profile/edit-profile/edit-profile').then(m => m.EditProfile)
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
      },
      {
        path: 'classes',
        loadComponent: () => import('./features/classes/classes.component').then(m => m.ClassesComponent)
      },
      {
        path: 'classes/add',
        loadComponent: () => import('./features/classes/add-class/add-class.component').then(m => m.AddClassComponent)
      },
      {
        path: 'classes/detail/:id',
        loadComponent: () => import('./features/classes/class-detail/class-detail.component').then(m => m.ClassDetailComponent)
      },
      {
        path: 'learning-games',
        loadComponent: () => import('./features/learning-games/learning-games.component').then(m => m.LearningGamesComponent)
      },
      {
        path: 'reclamations',
        loadComponent: () => import('./features/reclamations/reclamations.component').then(m => m.ReclamationsComponent)
      },
      {
        path: 'gallery',
        loadComponent: () => import('./features/gallery/gallery').then(m => m.Gallery)
      },
      {
        path: 'food-menu',
        loadComponent: () => import('./features/food-menu/food-menu.component').then(m => m.FoodMenuComponent)
      },
      {
        path: 'food-menu/add',
        loadComponent: () => import('./features/food-menu/add-menu/add-menu.component').then(m => m.AddMenuComponent)
      },
      {
        path: 'food-menu/edit/:id',
        loadComponent: () => import('./features/food-menu/add-menu/add-menu.component').then(m => m.AddMenuComponent)
      },
      {
        path: 'food-menu/food-items',
        loadComponent: () => import('./features/food-menu/food-items/food-items.component').then(m => m.FoodItemsComponent)
      },
      {
        path: 'food-menu/parent',
        loadComponent: () => import('./features/food-menu/parent-menu-view/parent-menu-view.component').then(m => m.ParentMenuViewComponent)
      },
      {
        path: 'food-menu/detail/:id',
        loadComponent: () => import('./features/food-menu/menu-detail/menu-detail.component').then(m => m.MenuDetailComponent)
      },
      {
        path: 'food-menu/report/:id',
        loadComponent: () => import('./features/food-menu/menu-report/menu-report.component').then(m => m.MenuReportComponent)
      },
      {
        path: 'notifications',
        loadComponent: () => import('./features/notifications/notifications.component').then(m => m.NotificationsComponent)
      },
      {
        path: 'profile-menu',
        loadComponent: () => import('./features/profile-menu/profile-menu.component').then(m => m.ProfileMenuComponent)
      },
      {
        path: 'qr-checkin',
        loadComponent: () => import('./features/qr-checkin/qr-checkin').then(m => m.QrCheckin)
      },
      {
        path: 'qr-management',
        loadComponent: () => import('./features/qr-management/qr-management').then(m => m.QrManagement)
      },
      {
        path: 'base-ui',
        loadComponent: () => import('./features/base-ui/base-ui').then(m => m.BaseUi)
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
