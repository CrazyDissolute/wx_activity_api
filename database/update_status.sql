update activity set ad_status=2 where act_time < (NOW() - interval 24 hour);
