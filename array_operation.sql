select video_id, video_uuid, video_groups from videos where video_groups && ARRAY[5,2] order by updated_at desc limit 5

select users.* --count(users.user_id) cnt 
       from groups, users 
       where group_company_id=2 and group_gid=38
        and group_gid = ANY(user_groups)  and users.deleted_at is null;

update videos set video_groups=ARRAY[5, 6] where video_id=278
update videos set video_groups='{"one", "two"}' where video_id=278
select * from users order by user_id desc

update users set deleted_at=null where user_uid='213'

update groups set deleted_at = null where group_gid = 38

select * from groups where group_gid = ANY(ARRAY[1])
select unnest(array[1,2,3])

with user_group AS (
select user_groups AS groups from users where user_company_id=2 and user_uid='testAdmin1'
)

select  ARRAY[1,2,3] && ARRAY[1] and ARRAY[1,2,3] && ARRAY[5]

select video_id, video_uuid, video_groups, deleted_at from videos  where deleted_at is null limit 5 where video_groups && (select groups from user_group)

select user_group_id, user_groups from users where user_groups.length =0 is null
update users set user_groups= ARRAY[1,10] where user_uid='testAdmin'

select * from users where user_uid='testAdmin'

SELECT 
        user_uid as uid, 
        user_fullname as fullname, 
        role_rid as rid, 
        user_company_id as cid,
        CASE WHEN users.user_groups IS NULL THEN '{}' ELSE users.user_groups END as gids, 
        (select CASE WHEN array_agg(group_name) IS NULL THEN '{}' ELSE array_agg(group_name) END from groups where "groups".group_gid = ANY(users.user_groups))  as groups_name, 
        user_email email 
      FROM users
      LEFT OUTER JOIN roles
      ON users.user_role_id = roles.role_id
--       LEFT OUTER JOIN "groups"
--       ON "groups".group_gid = ANY(users.user_groups)
      WHERE user_company_id=2
	  
UPDATE videos SET (video_groups::integer[]) = (SELECT '{ 1, 2, 3 }') 
         WHERE deleted_at IS NULL AND video_company_id=2 AND video_uuid='b82ba102-d638-4b4d-ad12-3a52cb60d7ec'
	  
	  