DELETE rp
FROM role_permission rp
JOIN role r ON r.id = rp.role_id
WHERE r.name = 'CORRETOR';

DELETE ua
FROM user_account ua
JOIN role r ON r.id = ua.role_id
WHERE r.name = 'CORRETOR';

DELETE FROM role
WHERE name = 'CORRETOR';
