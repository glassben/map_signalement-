# **Short presentation** 

Map_signalement is a reporting application made with javascript. 
Its main purpose is to inform efficiently the legal authority about degradation by automatically completing multiple time online formular using information provided by the user request.
It manipulates different frameworks such as Node.js, Selenium API to automatically fill in the reporting sheet and Gok APi to create text rewording the infraction discribed by the user.


# **Content of each file**

* index.js : is the entry of the server. It serves different pages that allow the user to create an account, identify itself, fill in a request (describing the location and the nature of the incident).

* queue.js : which manages the different requests of the users and transferts to the schedule.

* schedule.js : orchestrates the different calls to the scrapper and manage the potential errors that were thrown. It also records the requests that were sucessfully transmitted to the authority.

* worker.js : implements the website scrapper using the Selenium API in order to automatically send multiple report to the authority.

* ia.js : use the groq API in order to rewrite the user description to avoid redundancy. The groq model used is gpt-oss-20b. 

* send_mail.js : use the Brevo SMTP server to send email to the user informing if its requests were sucessfully sent to the authority.

* cloud.js : records the eventual images that were transmitted by the users request and which were sucessfully processed. 

* change_proxy.js : change the ip of the server at each request (not implemented in the final version).

# Security 

* All files try to implement the basic protection to garantee a secure connection for the user and the system itself.

* Specifically, we make sure to protect our system against CSRF attack, script injection, authentification, encrypted personal information, separation of priviledge.

* We audit our system protection with : snyk and sonarcloud.




