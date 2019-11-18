select * from users where user_company_id=2 and user_uid='213'

select * from groups where group_series is not null

select now()::date - '2019-04-10'::date

select * from videos where video_uuid in ('eb7474c4-971a-4364-a8c9-87e712feedf7', '7f3f547f-60ec-4684-9fa7-11c1c46deb9e')



select video_uuid from videos where video_company_id=2 and deleted_at is null and video_public=true order by created_at desc

WITH user_group AS (
          select user_groups AS groups, created_at AS reg_date from users where user_company_id=2 and user_uid='213'
        ),

        user_series AS (
          select array_agg (c) AS useries
			    from (select ser from (select unnest(group_series) AS ser
                from groups 
                where group_company_id=2 
                  and group_gid in (select unnest(groups) from user_group where groups IS NOT null)
                  and group_series IS NOT null ) bbb, series, user_group 
                  where series_id = ser 
                    AND (series_period_type is null OR 
                      (series_period_type='spec_period' AND now()::date between series_activity_start::date and series_activity_start::date) OR 
                      (series_period_type='user_reg' AND 
                       now()::date between CASE WHEN series_activity_by_user_start IS NULL THEN now()::date ELSE user_group.reg_date::date + series_activity_by_user_start END
                          AND CASE WHEN series_activity_by_user_finish IS NULL THEN now()::date ELSE user_group.reg_date::date + series_activity_by_user_finish END)
                     )
                  ) as dt(c)
        )

        SELECT 
          'v_'||video_id AS video_id,
          video_uuid,
          video_status,
          video_public,
          case when video_series is null then Array[0] else video_series END
        FROM videos
        WHERE  video_company_id = 2 
        AND ((video_groups && (select groups from user_group) OR 
            video_series && (select useries from user_series)) 
           ) AND video_public = true AND video_status='ready' AND videos.deleted_at IS NULL

select * from series

update series set series_activity_by_user_finish = null

SELECT 
        series_id as sid, 
        series_company_id as cid,         
        series_name as name
        --deleted_at AT TIME ZONE  AS deleted_at
      FROM "series"
      WHERE series_company_id=2