select * from companies
select crypt()

SELECT 'p'|| select encode(crypt(),'base64')::text;

do
$func$
BEGIN
   FOR counter IN 3..10 LOOP
--   RAISE NOTICE 'INSERT INTO companies (company_name, company_storage_id, company_corporate_code) values (%,%,%)', 'TestOrganization_'||repeat('0', 4-length(counter::text))||counter, 1, 'p'||left(gen_random_uuid()::text,5) ;
--INSERT INTO companies (company_name, company_storage_id, company_corporate_code) values ('TestOrganization_'||repeat('0', 4-length(counter::text))||counter, 1, 'p'||left(gen_random_uuid()::text,5) );

--INSERT INTO roles (role_name, role_company_id, role_is_admin, role_rid) values ('admin', counter+2, true, 'admin');
INSERT INTO users (user_uid, user_fullname, user_company_id, user_role_id, user_password) 
values ('TstOrg'||repeat('0', 4-length(counter::text))||counter||'_A0001',
	   'TstOrg'||repeat('0', 4-length(counter::text))||counter||'_A0001', counter+2, 73+counter, crypt('admin123', gen_salt('bf')));

   END LOOP;
END
$func$
SELECT 'p'||left(gen_random_uuid()::text,5);

select * from users
select * from roles order by role_id
