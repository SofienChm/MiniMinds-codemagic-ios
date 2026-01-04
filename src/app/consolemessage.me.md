
C:\laragon\www\miniminds\miniminds-api(main -> origin)
λ dotnet run
C:\laragon\www\miniminds\miniminds-api\DaycareAPI.csproj : warning NU1902: Le package 'System.IdentityModel.Tokens.Jwt' 7.0.3 présente une vulnérabilité de gravité moy enne connue, https://github.com/advisories/GHSA-59j7-ghrg-fj52.
C:\laragon\www\miniminds\miniminds-api\DaycareAPI.csproj : warning NU1902: Le package 'System.IdentityModel.Tokens.Jwt' 7.0.3 présente une vulnérabilité de gravité moy enne connue, https://github.com/advisories/GHSA-59j7-ghrg-fj52.
C:\laragon\www\miniminds\miniminds-api\Controllers\AttendanceController.cs(26,35): warning CS8602: Déréférencement d'une éventuelle référence null. [C:\laragon\www\min iminds\miniminds-api\DaycareAPI.csproj]
C:\laragon\www\miniminds\miniminds-api\Controllers\AttendanceController.cs(38,35): warning CS8602: Déréférencement d'une éventuelle référence null. [C:\laragon\www\min iminds\miniminds-api\DaycareAPI.csproj]
C:\laragon\www\miniminds\miniminds-api\Controllers\AttendanceController.cs(67,35): warning CS8602: Déréférencement d'une éventuelle référence null. [C:\laragon\www\min iminds\miniminds-api\DaycareAPI.csproj]
C:\laragon\www\miniminds\miniminds-api\Controllers\AttendanceController.cs(75,49): warning CS1998: Cette méthode async n'a pas d'opérateur 'await' et elle s'exécutera
de façon synchrone. Utilisez l'opérateur 'await' pour attendre les appels d'API non bloquants ou 'await Task.Run(…)' pour effectuer un travail utilisant le processeur
sur un thread d'arrière-plan. [C:\laragon\www\miniminds\miniminds-api\DaycareAPI.csproj]
C:\laragon\www\miniminds\miniminds-api\Controllers\EventParticipantsController.cs(30,35): warning CS8602: Déréférencement d'une éventuelle référence null. [C:\laragon\ www\miniminds\miniminds-api\DaycareAPI.csproj]
C:\laragon\www\miniminds\miniminds-api\Controllers\EventParticipantsController.cs(207,25): warning CS8602: Déréférencement d'une éventuelle référence null. [C:\laragon \www\miniminds\miniminds-api\DaycareAPI.csproj]
Database connection established.
info: Microsoft.EntityFrameworkCore.Database.Command[20101]
      Executed DbCommand (203ms) [Parameters=[@__normalizedName_0='?' (Size = 256)], CommandType='Text', CommandTimeout='30']
      SELECT `a`.`Id`, `a`.`ConcurrencyStamp`, `a`.`Name`, `a`.`NormalizedName`
      FROM `AspNetRoles` AS `a`
      WHERE `a`.`NormalizedName` = @__normalizedName_0
      LIMIT 1
info: Microsoft.EntityFrameworkCore.Database.Command[20101]
      Executed DbCommand (4ms) [Parameters=[@__normalizedName_0='?' (Size = 256)], CommandType='Text', CommandTimeout='30']
      SELECT `a`.`Id`, `a`.`ConcurrencyStamp`, `a`.`Name`, `a`.`NormalizedName`
      FROM `AspNetRoles` AS `a`
      WHERE `a`.`NormalizedName` = @__normalizedName_0
      LIMIT 1
info: Microsoft.EntityFrameworkCore.Database.Command[20101]
      Executed DbCommand (1ms) [Parameters=[@__normalizedName_0='?' (Size = 256)], CommandType='Text', CommandTimeout='30']
      SELECT `a`.`Id`, `a`.`ConcurrencyStamp`, `a`.`Name`, `a`.`NormalizedName`
      FROM `AspNetRoles` AS `a`
      WHERE `a`.`NormalizedName` = @__normalizedName_0
      LIMIT 1
info: Microsoft.EntityFrameworkCore.Database.Command[20101]
      Executed DbCommand (72ms) [Parameters=[@__normalizedEmail_0='?' (Size = 256)], CommandType='Text', CommandTimeout='30']
      SELECT `a`.`Id`, `a`.`AccessFailedCount`, `a`.`ConcurrencyStamp`, `a`.`CreatedAt`, `a`.`Email`, `a`.`EmailConfirmed`, `a`.`FirstName`, `a`.`LastName`, `a`.`LockoutEnabled`, `a`.`LockoutEnd`, `a`.`NormalizedEmail`, `a`.`NormalizedUserName`, `a`.`PasswordHash`, `a`.`PhoneNumber`, `a`.`PhoneNumberConfirmed`, `a`.`PreferredLanguage`, `a`.`ProfilePicture`, `a`.`SecurityStamp`, `a`.`TwoFactorEnabled`, `a`.`UpdatedAt`, `a`.`UserName`
      FROM `AspNetUsers` AS `a`
      WHERE `a`.`NormalizedEmail` = @__normalizedEmail_0
      LIMIT 2
Server running at http://localhost:5001
warn: Microsoft.AspNetCore.Server.Kestrel[0]
      Overriding address(es) 'http://localhost:5001'. Binding to endpoints defined via IConfiguration and/or UseKestrel() instead.
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://localhost:5001
info: Microsoft.Hosting.Lifetime[0]
      Application started. Press Ctrl+C to shut down.
info: Microsoft.Hosting.Lifetime[0]
      Hosting environment: Production
info: Microsoft.Hosting.Lifetime[0]
      Content root path: C:\laragon\www\miniminds\miniminds-api
[GetConversations] CurrentUserId: admin@daycare.com
info: Microsoft.EntityFrameworkCore.Database.Command[20101]
      Executed DbCommand (1ms) [Parameters=[], CommandType='Text', CommandTimeout='30']
      SELECT COUNT(*)
      FROM `Messages` AS `m`
[GetConversations] Total messages in DB: 16
[GetConversations] CurrentUserId: sofienparents@email.com
info: Microsoft.EntityFrameworkCore.Database.Command[20101]
      Executed DbCommand (10ms) [Parameters=[@__currentUserId_0='?' (Size = 255)], CommandType='Text', CommandTimeout='30']
      SELECT COUNT(*)
      FROM `Messages` AS `m`
      WHERE (`m`.`SenderId` = @__currentUserId_0) OR (`m`.`RecipientId` = @__currentUserId_0)
[GetConversations] User messages: 0
info: Microsoft.EntityFrameworkCore.Database.Command[20101]
      Executed DbCommand (1ms) [Parameters=[], CommandType='Text', CommandTimeout='30']
      SELECT COUNT(*)
      FROM `Messages` AS `m`
[GetConversations] Total messages in DB: 16
info: Microsoft.EntityFrameworkCore.Database.Command[20101]
      Executed DbCommand (1ms) [Parameters=[@__currentUserId_0='?' (Size = 255)], CommandType='Text', CommandTimeout='30']
      SELECT COUNT(*)
      FROM `Messages` AS `m`
      WHERE (`m`.`SenderId` = @__currentUserId_0) OR (`m`.`RecipientId` = @__currentUserId_0)
[GetConversations] User messages: 0
[GetConversations] Error: The LINQ expression 'DbSet<Message>()
    .Where(m => m.SenderId == __currentUserId_0 || m.RecipientId == __currentUserId_0)
    .GroupBy(m => m.SenderId == __currentUserId_0 ? m.RecipientId : m.SenderId)
    .Select(g => new {
        UserId = g.Key,
        User = g
            .AsQueryable()
            .Select(e => e.SenderId)
            .First() == __currentUserId_0 ? g
            .AsQueryable()
            .Join(
                inner: DbSet<ApplicationUser>(),
                outerKeySelector: e => EF.Property<string>(e, "RecipientId"),
                innerKeySelector: a => EF.Property<string>(a, "Id"),
                resultSelector: (o, i) => new TransparentIdentifier<Message, ApplicationUser>(
                    Outer = o,
                    Inner = i
                ))
            .Select(e => e.Inner)
            .First() : g
            .AsQueryable()
            .Join(
                inner: DbSet<ApplicationUser>(),
                outerKeySelector: e => EF.Property<string>(e, "SenderId"),
                innerKeySelector: a0 => EF.Property<string>(a0, "Id"),
                resultSelector: (o, i) => new TransparentIdentifier<Message, ApplicationUser>(
                    Outer = o,
                    Inner = i
                ))
            .Select(e => e.Inner)
            .First(),
        LastMessage = g
            .AsQueryable()
            .OrderByDescending(e => e.SentAt)
            .Join(
                inner: DbSet<ApplicationUser>(),
                outerKeySelector: e => EF.Property<string>(e, "SenderId"),
                innerKeySelector: a1 => EF.Property<string>(a1, "Id"),
                resultSelector: (o, i) => new TransparentIdentifier<Message, ApplicationUser>(
                    Outer = o,
                    Inner = i
                ))
            .Join(
                inner: DbSet<ApplicationUser>(),
                outerKeySelector: e => EF.Property<string>(e.Outer, "RecipientId"),
                innerKeySelector: a2 => EF.Property<string>(a2, "Id"),
                resultSelector: (o, i) => new TransparentIdentifier<TransparentIdentifier<Message, ApplicationUser>, ApplicationUser>(
                    Outer = o,
                    Inner = i
                ))
            .Select(e => IncludeExpression(
                EntityExpression:
                IncludeExpression(
                    EntityExpression:
                    e.Outer.Outer,
                    NavigationExpression:
                    e.Outer.Inner, Sender)
                ,
                NavigationExpression:
                e.Inner, Recipient)
            )
            .First(),
        UnreadCount = g
            .AsQueryable()
            .Count(e => e.RecipientId == __currentUserId_0 && !(e.IsRead))
     })
    .OrderByDescending(e0 => e0.LastMessage.SentAt)' could not be translated. Either rewrite the query in a form that can be translated, or switch to client evaluation explicitly by inserting a call to 'AsEnumerable', 'AsAsyncEnumerable', 'ToList', or 'ToListAsync'. See https://go.microsoft.com/fwlink/?linkid=2101038 for more information.
[GetConversations] Error: The LINQ expression 'DbSet<Message>()
    .Where(m => m.SenderId == __currentUserId_0 || m.RecipientId == __currentUserId_0)
    .GroupBy(m => m.SenderId == __currentUserId_0 ? m.RecipientId : m.SenderId)
    .Select(g => new {
        UserId = g.Key,
        User = g
            .AsQueryable()
            .Select(e => e.SenderId)
            .First() == __currentUserId_0 ? g
            .AsQueryable()
            .Join(
                inner: DbSet<ApplicationUser>(),
                outerKeySelector: e => EF.Property<string>(e, "RecipientId"),
                innerKeySelector: a => EF.Property<string>(a, "Id"),
                resultSelector: (o, i) => new TransparentIdentifier<Message, ApplicationUser>(
                    Outer = o,
                    Inner = i
                ))
            .Select(e => e.Inner)
            .First() : g
            .AsQueryable()
            .Join(
                inner: DbSet<ApplicationUser>(),
                outerKeySelector: e => EF.Property<string>(e, "SenderId"),
                innerKeySelector: a0 => EF.Property<string>(a0, "Id"),
                resultSelector: (o, i) => new TransparentIdentifier<Message, ApplicationUser>(
                    Outer = o,
                    Inner = i
                ))
            .Select(e => e.Inner)
            .First(),
        LastMessage = g
            .AsQueryable()
            .OrderByDescending(e => e.SentAt)
            .Join(
                inner: DbSet<ApplicationUser>(),
                outerKeySelector: e => EF.Property<string>(e, "SenderId"),
                innerKeySelector: a1 => EF.Property<string>(a1, "Id"),
                resultSelector: (o, i) => new TransparentIdentifier<Message, ApplicationUser>(
                    Outer = o,
                    Inner = i
                ))
            .Join(
                inner: DbSet<ApplicationUser>(),
                outerKeySelector: e => EF.Property<string>(e.Outer, "RecipientId"),
                innerKeySelector: a2 => EF.Property<string>(a2, "Id"),
                resultSelector: (o, i) => new TransparentIdentifier<TransparentIdentifier<Message, ApplicationUser>, ApplicationUser>(
                    Outer = o,
                    Inner = i
                ))
            .Select(e => IncludeExpression(
                EntityExpression:
                IncludeExpression(
                    EntityExpression:
                    e.Outer.Outer,
                    NavigationExpression:
                    e.Outer.Inner, Sender)
                ,
                NavigationExpression:
                e.Inner, Recipient)
            )
            .First(),
        UnreadCount = g
            .AsQueryable()
            .Count(e => e.RecipientId == __currentUserId_0 && !(e.IsRead))
     })
    .OrderByDescending(e0 => e0.LastMessage.SentAt)' could not be translated. Either rewrite the query in a form that can be translated, or switch to client evaluation explicitly by inserting a call to 'AsEnumerable', 'AsAsyncEnumerable', 'ToList', or 'ToListAsync'. See https://go.microsoft.com/fwlink/?linkid=2101038 for more information.
info: Microsoft.EntityFrameworkCore.Database.Command[20101]
      Executed DbCommand (2ms) [Parameters=[@__currentUserId_0='?' (Size = 255), @__8__locals1_userId_1='?' (Size = 255)], CommandType='Text', CommandTimeout='30']
      SELECT `m`.`Id`, `m`.`Content`, `m`.`IsRead`, `m`.`RecipientId`, `m`.`SenderId`, `m`.`SentAt`, `a`.`Id`, `a`.`AccessFailedCount`, `a`.`ConcurrencyStamp`, `a`.`CreatedAt`, `a`.`Email`, `a`.`EmailConfirmed`, `a`.`FirstName`, `a`.`LastName`, `a`.`LockoutEnabled`, `a`.`LockoutEnd`, `a`.`NormalizedEmail`, `a`.`NormalizedUserName`, `a`.`PasswordHash`, `a`.`PhoneNumber`, `a`.`PhoneNumberConfirmed`, `a`.`PreferredLanguage`, `a`.`ProfilePicture`, `a`.`SecurityStamp`, `a`.`TwoFactorEnabled`, `a`.`UpdatedAt`, `a`.`UserName`, `a0`.`Id`, `a0`.`AccessFailedCount`, `a0`.`ConcurrencyStamp`, `a0`.`CreatedAt`, `a0`.`Email`, `a0`.`EmailConfirmed`, `a0`.`FirstName`, `a0`.`LastName`, `a0`.`LockoutEnabled`, `a0`.`LockoutEnd`, `a0`.`NormalizedEmail`, `a0`.`NormalizedUserName`, `a0`.`PasswordHash`, `a0`.`PhoneNumber`, `a0`.`PhoneNumberConfirmed`, `a0`.`PreferredLanguage`, `a0`.`ProfilePicture`, `a0`.`SecurityStamp`, `a0`.`TwoFactorEnabled`, `a0`.`UpdatedAt`, `a0`.`UserName`
      FROM `Messages` AS `m`
      INNER JOIN `AspNetUsers` AS `a` ON `m`.`SenderId` = `a`.`Id`
      INNER JOIN `AspNetUsers` AS `a0` ON `m`.`RecipientId` = `a0`.`Id`
      WHERE ((`m`.`SenderId` = @__currentUserId_0) AND (`m`.`RecipientId` = @__8__locals1_userId_1)) OR ((`m`.`SenderId` = @__8__locals1_userId_1) AND (`m`.`RecipientId` = @__currentUserId_0))
      ORDER BY `m`.`SentAt`
info: Microsoft.EntityFrameworkCore.Database.Command[20101]
      Executed DbCommand (1ms) [Parameters=[@__currentUserId_0='?' (Size = 255), @__8__locals1_userId_1='?' (Size = 255)], CommandType='Text', CommandTimeout='30']
      SELECT `m`.`Id`, `m`.`Content`, `m`.`IsRead`, `m`.`RecipientId`, `m`.`SenderId`, `m`.`SentAt`, `a`.`Id`, `a`.`AccessFailedCount`, `a`.`ConcurrencyStamp`, `a`.`CreatedAt`, `a`.`Email`, `a`.`EmailConfirmed`, `a`.`FirstName`, `a`.`LastName`, `a`.`LockoutEnabled`, `a`.`LockoutEnd`, `a`.`NormalizedEmail`, `a`.`NormalizedUserName`, `a`.`PasswordHash`, `a`.`PhoneNumber`, `a`.`PhoneNumberConfirmed`, `a`.`PreferredLanguage`, `a`.`ProfilePicture`, `a`.`SecurityStamp`, `a`.`TwoFactorEnabled`, `a`.`UpdatedAt`, `a`.`UserName`, `a0`.`Id`, `a0`.`AccessFailedCount`, `a0`.`ConcurrencyStamp`, `a0`.`CreatedAt`, `a0`.`Email`, `a0`.`EmailConfirmed`, `a0`.`FirstName`, `a0`.`LastName`, `a0`.`LockoutEnabled`, `a0`.`LockoutEnd`, `a0`.`NormalizedEmail`, `a0`.`NormalizedUserName`, `a0`.`PasswordHash`, `a0`.`PhoneNumber`, `a0`.`PhoneNumberConfirmed`, `a0`.`PreferredLanguage`, `a0`.`ProfilePicture`, `a0`.`SecurityStamp`, `a0`.`TwoFactorEnabled`, `a0`.`UpdatedAt`, `a0`.`UserName`
      FROM `Messages` AS `m`
      INNER JOIN `AspNetUsers` AS `a` ON `m`.`SenderId` = `a`.`Id`
      INNER JOIN `AspNetUsers` AS `a0` ON `m`.`RecipientId` = `a0`.`Id`
      WHERE ((`m`.`SenderId` = @__currentUserId_0) AND (`m`.`RecipientId` = @__8__locals1_userId_1)) OR ((`m`.`SenderId` = @__8__locals1_userId_1) AND (`m`.`RecipientId` = @__currentUserId_0))
      ORDER BY `m`.`SentAt`
[SendMessage] CurrentUserId: admin@daycare.com
[SendMessage] RecipientId: 3c0ba2f0-d374-4957-8938-4595818ee841
[SendMessage] Content: fafafa
fail: Microsoft.EntityFrameworkCore.Database.Command[20102]
      Failed executing DbCommand (34ms) [Parameters=[@p0='?' (Size = 4000), @p1='?' (DbType = Boolean), @p2='?' (Size = 255), @p3='?' (Size = 255), @p4='?' (DbType = DateTime)], CommandType='Text', CommandTimeout='30']
      INSERT INTO `Messages` (`Content`, `IsRead`, `RecipientId`, `SenderId`, `SentAt`)
      VALUES (@p0, @p1, @p2, @p3, @p4);
      SELECT `Id`
      FROM `Messages`
      WHERE ROW_COUNT() = 1 AND `Id` = LAST_INSERT_ID();
fail: Microsoft.EntityFrameworkCore.Update[10000]
      An exception occurred in the database while saving changes for context type 'DaycareAPI.Data.ApplicationDbContext'.
      Microsoft.EntityFrameworkCore.DbUpdateException: An error occurred while saving the entity changes. See the inner exception for details.
       ---> MySqlConnector.MySqlException (0x80004005): Cannot add or update a child row: a foreign key constraint fails (`daycaredb`.`messages`, CONSTRAINT `FK_Messages_AspNetUsers_SenderId` FOREIGN KEY (`SenderId`) REFERENCES `aspnetusers` (`Id`) ON DELETE RESTRICT)
         at MySqlConnector.Core.ServerSession.ReceiveReplyAsync(IOBehavior ioBehavior, CancellationToken cancellationToken) in /_/src/MySqlConnector/Core/ServerSession.cs:line 894
         at MySqlConnector.Core.ResultSet.ReadResultSetHeaderAsync(IOBehavior ioBehavior) in /_/src/MySqlConnector/Core/ResultSet.cs:line 37
         at MySqlConnector.MySqlDataReader.ActivateResultSet(CancellationToken cancellationToken) in /_/src/MySqlConnector/MySqlDataReader.cs:line 130
         at MySqlConnector.MySqlDataReader.InitAsync(CommandListPosition commandListPosition, ICommandPayloadCreator payloadCreator, IDictionary`2 cachedProcedures, IMySqlCommand command, CommandBehavior behavior, Activity activity, IOBehavior ioBehavior, CancellationToken cancellationToken) in /_/src/MySqlConnector/MySqlDataReader.cs:line 483
         at MySqlConnector.Core.CommandExecutor.ExecuteReaderAsync(CommandListPosition commandListPosition, ICommandPayloadCreator payloadCreator, CommandBehavior behavior, Activity activity, IOBehavior ioBehavior, CancellationToken cancellationToken) in /_/src/MySqlConnector/Core/CommandExecutor.cs:line 56
         at MySqlConnector.MySqlCommand.ExecuteReaderAsync(CommandBehavior behavior, IOBehavior ioBehavior, CancellationToken cancellationToken) in /_/src/MySqlConnector/MySqlCommand.cs:line 357
         at MySqlConnector.MySqlCommand.ExecuteDbDataReaderAsync(CommandBehavior behavior, CancellationToken cancellationToken) in /_/src/MySqlConnector/MySqlCommand.cs:line 350
         at Microsoft.EntityFrameworkCore.Storage.RelationalCommand.ExecuteReaderAsync(RelationalCommandParameterObject parameterObject, CancellationToken cancellationToken)
         at Microsoft.EntityFrameworkCore.Storage.RelationalCommand.ExecuteReaderAsync(RelationalCommandParameterObject parameterObject, CancellationToken cancellationToken)
         at Microsoft.EntityFrameworkCore.Update.ReaderModificationCommandBatch.ExecuteAsync(IRelationalConnection connection, CancellationToken cancellationToken)
         --- End of inner exception stack trace ---
         at Microsoft.EntityFrameworkCore.Update.ReaderModificationCommandBatch.ExecuteAsync(IRelationalConnection connection, CancellationToken cancellationToken)
         at Microsoft.EntityFrameworkCore.Update.Internal.BatchExecutor.ExecuteAsync(IEnumerable`1 commandBatches, IRelationalConnection connection, CancellationToken cancellationToken)
         at Microsoft.EntityFrameworkCore.Update.Internal.BatchExecutor.ExecuteAsync(IEnumerable`1 commandBatches, IRelationalConnection connection, CancellationToken cancellationToken)
         at Microsoft.EntityFrameworkCore.Update.Internal.BatchExecutor.ExecuteAsync(IEnumerable`1 commandBatches, IRelationalConnection connection, CancellationToken cancellationToken)
         at Microsoft.EntityFrameworkCore.ChangeTracking.Internal.StateManager.SaveChangesAsync(IList`1 entriesToSave, CancellationToken cancellationToken)
         at Microsoft.EntityFrameworkCore.ChangeTracking.Internal.StateManager.SaveChangesAsync(StateManager stateManager, Boolean acceptAllChangesOnSuccess, CancellationToken cancellationToken)
         at Pomelo.EntityFrameworkCore.MySql.Storage.Internal.MySqlExecutionStrategy.ExecuteAsync[TState,TResult](TState state, Func`4 operation, Func`4 verifySucceeded, CancellationToken cancellationToken)
         at Microsoft.EntityFrameworkCore.DbContext.SaveChangesAsync(Boolean acceptAllChangesOnSuccess, CancellationToken cancellationToken)
      Microsoft.EntityFrameworkCore.DbUpdateException: An error occurred while saving the entity changes. See the inner exception for details.
       ---> MySqlConnector.MySqlException (0x80004005): Cannot add or update a child row: a foreign key constraint fails (`daycaredb`.`messages`, CONSTRAINT `FK_Messages_AspNetUsers_SenderId` FOREIGN KEY (`SenderId`) REFERENCES `aspnetusers` (`Id`) ON DELETE RESTRICT)
         at MySqlConnector.Core.ServerSession.ReceiveReplyAsync(IOBehavior ioBehavior, CancellationToken cancellationToken) in /_/src/MySqlConnector/Core/ServerSession.cs:line 894
         at MySqlConnector.Core.ResultSet.ReadResultSetHeaderAsync(IOBehavior ioBehavior) in /_/src/MySqlConnector/Core/ResultSet.cs:line 37
         at MySqlConnector.MySqlDataReader.ActivateResultSet(CancellationToken cancellationToken) in /_/src/MySqlConnector/MySqlDataReader.cs:line 130
         at MySqlConnector.MySqlDataReader.InitAsync(CommandListPosition commandListPosition, ICommandPayloadCreator payloadCreator, IDictionary`2 cachedProcedures, IMySqlCommand command, CommandBehavior behavior, Activity activity, IOBehavior ioBehavior, CancellationToken cancellationToken) in /_/src/MySqlConnector/MySqlDataReader.cs:line 483
         at MySqlConnector.Core.CommandExecutor.ExecuteReaderAsync(CommandListPosition commandListPosition, ICommandPayloadCreator payloadCreator, CommandBehavior behavior, Activity activity, IOBehavior ioBehavior, CancellationToken cancellationToken) in /_/src/MySqlConnector/Core/CommandExecutor.cs:line 56
         at MySqlConnector.MySqlCommand.ExecuteReaderAsync(CommandBehavior behavior, IOBehavior ioBehavior, CancellationToken cancellationToken) in /_/src/MySqlConnector/MySqlCommand.cs:line 357
         at MySqlConnector.MySqlCommand.ExecuteDbDataReaderAsync(CommandBehavior behavior, CancellationToken cancellationToken) in /_/src/MySqlConnector/MySqlCommand.cs:line 350
         at Microsoft.EntityFrameworkCore.Storage.RelationalCommand.ExecuteReaderAsync(RelationalCommandParameterObject parameterObject, CancellationToken cancellationToken)
         at Microsoft.EntityFrameworkCore.Storage.RelationalCommand.ExecuteReaderAsync(RelationalCommandParameterObject parameterObject, CancellationToken cancellationToken)
         at Microsoft.EntityFrameworkCore.Update.ReaderModificationCommandBatch.ExecuteAsync(IRelationalConnection connection, CancellationToken cancellationToken)
         --- End of inner exception stack trace ---
         at Microsoft.EntityFrameworkCore.Update.ReaderModificationCommandBatch.ExecuteAsync(IRelationalConnection connection, CancellationToken cancellationToken)
         at Microsoft.EntityFrameworkCore.Update.Internal.BatchExecutor.ExecuteAsync(IEnumerable`1 commandBatches, IRelationalConnection connection, CancellationToken cancellationToken)
         at Microsoft.EntityFrameworkCore.Update.Internal.BatchExecutor.ExecuteAsync(IEnumerable`1 commandBatches, IRelationalConnection connection, CancellationToken cancellationToken)
         at Microsoft.EntityFrameworkCore.Update.Internal.BatchExecutor.ExecuteAsync(IEnumerable`1 commandBatches, IRelationalConnection connection, CancellationToken cancellationToken)
         at Microsoft.EntityFrameworkCore.ChangeTracking.Internal.StateManager.SaveChangesAsync(IList`1 entriesToSave, CancellationToken cancellationToken)
         at Microsoft.EntityFrameworkCore.ChangeTracking.Internal.StateManager.SaveChangesAsync(StateManager stateManager, Boolean acceptAllChangesOnSuccess, CancellationToken cancellationToken)
         at Pomelo.EntityFrameworkCore.MySql.Storage.Internal.MySqlExecutionStrategy.ExecuteAsync[TState,TResult](TState state, Func`4 operation, Func`4 verifySucceeded, CancellationToken cancellationToken)
         at Microsoft.EntityFrameworkCore.DbContext.SaveChangesAsync(Boolean acceptAllChangesOnSuccess, CancellationToken cancellationToken)
[SendMessage] Error: An error occurred while saving the entity changes. See the inner exception for details.
[SendMessage] StackTrace:    at Microsoft.EntityFrameworkCore.Update.ReaderModificationCommandBatch.ExecuteAsync(IRelationalConnection connection, CancellationToken cancellationToken)
   at Microsoft.EntityFrameworkCore.Update.Internal.BatchExecutor.ExecuteAsync(IEnumerable`1 commandBatches, IRelationalConnection connection, CancellationToken cancellationToken)
   at Microsoft.EntityFrameworkCore.Update.Internal.BatchExecutor.ExecuteAsync(IEnumerable`1 commandBatches, IRelationalConnection connection, CancellationToken cancellationToken)
   at Microsoft.EntityFrameworkCore.Update.Internal.BatchExecutor.ExecuteAsync(IEnumerable`1 commandBatches, IRelationalConnection connection, CancellationToken cancellationToken)
   at Microsoft.EntityFrameworkCore.ChangeTracking.Internal.StateManager.SaveChangesAsync(IList`1 entriesToSave, CancellationToken cancellationToken)
   at Microsoft.EntityFrameworkCore.ChangeTracking.Internal.StateManager.SaveChangesAsync(StateManager stateManager, Boolean acceptAllChangesOnSuccess, CancellationToken cancellationToken)
   at Pomelo.EntityFrameworkCore.MySql.Storage.Internal.MySqlExecutionStrategy.ExecuteAsync[TState,TResult](TState state, Func`4 operation, Func`4 verifySucceeded, CancellationToken cancellationToken)
   at Microsoft.EntityFrameworkCore.DbContext.SaveChangesAsync(Boolean acceptAllChangesOnSuccess, CancellationToken cancellationToken)
   at Microsoft.EntityFrameworkCore.DbContext.SaveChangesAsync(Boolean acceptAllChangesOnSuccess, CancellationToken cancellationToken)
   at DaycareAPI.Controllers.MessagesController.SendMessage(SendMessageDto messageDto) in C:\laragon\www\miniminds\miniminds-api\Controllers\MessagesController.cs:line 118
[GetConversations] CurrentUserId: admin@daycare.com
[GetConversations] Total messages in DB: 16
info: Microsoft.EntityFrameworkCore.Database.Command[20101]
      Executed DbCommand (0ms) [Parameters=[], CommandType='Text', CommandTimeout='30']
      SELECT COUNT(*)
      FROM `Messages` AS `m`
[GetConversations] User messages: 0
info: Microsoft.EntityFrameworkCore.Database.Command[20101]
      Executed DbCommand (1ms) [Parameters=[@__currentUserId_0='?' (Size = 255)], CommandType='Text', CommandTimeout='30']
      SELECT COUNT(*)
      FROM `Messages` AS `m`
      WHERE (`m`.`SenderId` = @__currentUserId_0) OR (`m`.`RecipientId` = @__currentUserId_0)
[GetConversations] Error: The LINQ expression 'DbSet<Message>()
    .Where(m => m.SenderId == __currentUserId_0 || m.RecipientId == __currentUserId_0)
    .GroupBy(m => m.SenderId == __currentUserId_0 ? m.RecipientId : m.SenderId)
    .Select(g => new {
        UserId = g.Key,
        User = g
            .AsQueryable()
            .Select(e => e.SenderId)
            .First() == __currentUserId_0 ? g
            .AsQueryable()
            .Join(
                inner: DbSet<ApplicationUser>(),
                outerKeySelector: e => EF.Property<string>(e, "RecipientId"),
                innerKeySelector: a => EF.Property<string>(a, "Id"),
                resultSelector: (o, i) => new TransparentIdentifier<Message, ApplicationUser>(
                    Outer = o,
                    Inner = i
                ))
            .Select(e => e.Inner)
            .First() : g
            .AsQueryable()
            .Join(
                inner: DbSet<ApplicationUser>(),
                outerKeySelector: e => EF.Property<string>(e, "SenderId"),
                innerKeySelector: a0 => EF.Property<string>(a0, "Id"),
                resultSelector: (o, i) => new TransparentIdentifier<Message, ApplicationUser>(
                    Outer = o,
                    Inner = i
                ))
            .Select(e => e.Inner)
            .First(),
        LastMessage = g
            .AsQueryable()
            .OrderByDescending(e => e.SentAt)
            .Join(
                inner: DbSet<ApplicationUser>(),
                outerKeySelector: e => EF.Property<string>(e, "SenderId"),
                innerKeySelector: a1 => EF.Property<string>(a1, "Id"),
                resultSelector: (o, i) => new TransparentIdentifier<Message, ApplicationUser>(
                    Outer = o,
                    Inner = i
                ))
            .Join(
                inner: DbSet<ApplicationUser>(),
                outerKeySelector: e => EF.Property<string>(e.Outer, "RecipientId"),
                innerKeySelector: a2 => EF.Property<string>(a2, "Id"),
                resultSelector: (o, i) => new TransparentIdentifier<TransparentIdentifier<Message, ApplicationUser>, ApplicationUser>(
                    Outer = o,
                    Inner = i
                ))
            .Select(e => IncludeExpression(
                EntityExpression:
                IncludeExpression(
                    EntityExpression:
                    e.Outer.Outer,
                    NavigationExpression:
                    e.Outer.Inner, Sender)
                ,
                NavigationExpression:
                e.Inner, Recipient)
            )
            .First(),
        UnreadCount = g
            .AsQueryable()
            .Count(e => e.RecipientId == __currentUserId_0 && !(e.IsRead))
     })
    .OrderByDescending(e0 => e0.LastMessage.SentAt)' could not be translated. Either rewrite the query in a form that can be translated, or switch to client evaluation explicitly by inserting a call to 'AsEnumerable', 'AsAsyncEnumerable', 'ToList', or 'ToListAsync'. See https://go.microsoft.com/fwlink/?linkid=2101038 for more information.
[GetConversations] CurrentUserId: admin@daycare.com
info: Microsoft.EntityFrameworkCore.Database.Command[20101]
      Executed DbCommand (1ms) [Parameters=[], CommandType='Text', CommandTimeout='30']
      SELECT COUNT(*)
      FROM `Messages` AS `m`
[GetConversations] Total messages in DB: 16
info[GetConversations] User messages: 0
: Microsoft.EntityFrameworkCore.Database.Command[20101]
      Executed DbCommand (1ms) [Parameters=[@__currentUserId_0='?' (Size = 255)], CommandType='Text', CommandTimeout='30']
      SELECT COUNT(*)
      FROM `Messages` AS `m`
      WHERE (`m`.`SenderId` = @__currentUserId_0) OR (`m`.`RecipientId` = @__currentUserId_0)
[GetConversations] CurrentUserId: sofienparents@email.com
[GetConversations] Total messages in DB: 16
info: Microsoft.EntityFrameworkCore.Database.Command[20101]
      Executed DbCommand (1ms) [Parameters=[], CommandType='Text', CommandTimeout='30']
      SELECT COUNT(*)
      FROM `Messages` AS `m`
[GetConversations] User messages: 0
info: Microsoft.EntityFrameworkCore.Database.Command[20101]
      Executed DbCommand (1ms) [Parameters=[@__currentUserId_0='?' (Size = 255)], CommandType='Text', CommandTimeout='30']
      SELECT COUNT(*)
      FROM `Messages` AS `m`
      WHERE (`m`.`SenderId` = @__currentUserId_0) OR (`m`.`RecipientId` = @__currentUserId_0)
[GetConversations] Error: The LINQ expression 'DbSet<Message>()
    .Where(m => m.SenderId == __currentUserId_0 || m.RecipientId == __currentUserId_0)
    .GroupBy(m => m.SenderId == __currentUserId_0 ? m.RecipientId : m.SenderId)
    .Select(g => new {
        UserId = g.Key,
        User = g
            .AsQueryable()
            .Select(e => e.SenderId)
            .First() == __currentUserId_0 ? g
            .AsQueryable()
            .Join(
                inner: DbSet<ApplicationUser>(),
                outerKeySelector: e => EF.Property<string>(e, "RecipientId"),
                innerKeySelector: a => EF.Property<string>(a, "Id"),
                resultSelector: (o, i) => new TransparentIdentifier<Message, ApplicationUser>(
                    Outer = o,
                    Inner = i
                ))
            .Select(e => e.Inner)
            .First() : g
            .AsQueryable()
            .Join(
                inner: DbSet<ApplicationUser>(),
                outerKeySelector: e => EF.Property<string>(e, "SenderId"),
                innerKeySelector: a0 => EF.Property<string>(a0, "Id"),
                resultSelector: (o, i) => new TransparentIdentifier<Message, ApplicationUser>(
                    Outer = o,
                    Inner = i
                ))
            .Select(e => e.Inner)
            .First(),
        LastMessage = g
            .AsQueryable()
            .OrderByDescending(e => e.SentAt)
            .Join(
                inner: DbSet<ApplicationUser>(),
                outerKeySelector: e => EF.Property<string>(e, "SenderId"),
                innerKeySelector: a1 => EF.Property<string>(a1, "Id"),
                resultSelector: (o, i) => new TransparentIdentifier<Message, ApplicationUser>(
                    Outer = o,
                    Inner = i
                ))
            .Join(
                inner: DbSet<ApplicationUser>(),
                outerKeySelector: e => EF.Property<string>(e.Outer, "RecipientId"),
                innerKeySelector: a2 => EF.Property<string>(a2, "Id"),
                resultSelector: (o, i) => new TransparentIdentifier<TransparentIdentifier<Message, ApplicationUser>, ApplicationUser>(
                    Outer = o,
                    Inner = i
                ))
            .Select(e => IncludeExpression(
                EntityExpression:
                IncludeExpression(
                    EntityExpression:
                    e.Outer.Outer,
                    NavigationExpression:
                    e.Outer.Inner, Sender)
                ,
                NavigationExpression:
                e.Inner, Recipient)
            )
            .First(),
        UnreadCount = g
            .AsQueryable()
            .Count(e => e.RecipientId == __currentUserId_0 && !(e.IsRead))
     })
    .OrderByDescending(e0 => e0.LastMessage.SentAt)' could not be translated. Either rewrite the query in a form that can be translated, or switch to client evaluation explicitly by inserting a call to 'AsEnumerable', 'AsAsyncEnumerable', 'ToList', or 'ToListAsync'. See https://go.microsoft.com/fwlink/?linkid=2101038 for more information.
[GetConversations] Error: The LINQ expression 'DbSet<Message>()
    .Where(m => m.SenderId == __currentUserId_0 || m.RecipientId == __currentUserId_0)
    .GroupBy(m => m.SenderId == __currentUserId_0 ? m.RecipientId : m.SenderId)
    .Select(g => new {
        UserId = g.Key,
        User = g
            .AsQueryable()
            .Select(e => e.SenderId)
            .First() == __currentUserId_0 ? g
            .AsQueryable()
            .Join(
                inner: DbSet<ApplicationUser>(),
                outerKeySelector: e => EF.Property<string>(e, "RecipientId"),
                innerKeySelector: a => EF.Property<string>(a, "Id"),
                resultSelector: (o, i) => new TransparentIdentifier<Message, ApplicationUser>(
                    Outer = o,
                    Inner = i
                ))
            .Select(e => e.Inner)
            .First() : g
            .AsQueryable()
            .Join(
                inner: DbSet<ApplicationUser>(),
                outerKeySelector: e => EF.Property<string>(e, "SenderId"),
                innerKeySelector: a0 => EF.Property<string>(a0, "Id"),
                resultSelector: (o, i) => new TransparentIdentifier<Message, ApplicationUser>(
                    Outer = o,
                    Inner = i
                ))
            .Select(e => e.Inner)
            .First(),
        LastMessage = g
            .AsQueryable()
            .OrderByDescending(e => e.SentAt)
            .Join(
                inner: DbSet<ApplicationUser>(),
                outerKeySelector: e => EF.Property<string>(e, "SenderId"),
                innerKeySelector: a1 => EF.Property<string>(a1, "Id"),
                resultSelector: (o, i) => new TransparentIdentifier<Message, ApplicationUser>(
                    Outer = o,
                    Inner = i
                ))
            .Join(
                inner: DbSet<ApplicationUser>(),
                outerKeySelector: e => EF.Property<string>(e.Outer, "RecipientId"),
                innerKeySelector: a2 => EF.Property<string>(a2, "Id"),
                resultSelector: (o, i) => new TransparentIdentifier<TransparentIdentifier<Message, ApplicationUser>, ApplicationUser>(
                    Outer = o,
                    Inner = i
                ))
            .Select(e => IncludeExpression(
                EntityExpression:
                IncludeExpression(
                    EntityExpression:
                    e.Outer.Outer,
                    NavigationExpression:
                    e.Outer.Inner, Sender)
                ,
                NavigationExpression:
                e.Inner, Recipient)
            )
            .First(),
        UnreadCount = g
            .AsQueryable()
            .Count(e => e.RecipientId == __currentUserId_0 && !(e.IsRead))
     })
    .OrderByDescending(e0 => e0.LastMessage.SentAt)' could not be translated. Either rewrite the query in a form that can be translated, or switch to client evaluation explicitly by inserting a call to 'AsEnumerable', 'AsAsyncEnumerable', 'ToList', or 'ToListAsync'. See https://go.microsoft.com/fwlink/?linkid=2101038 for more information.