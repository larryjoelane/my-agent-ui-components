<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Dynamic Form Component</title>
</head>
<body>
  <div id="form-container"></div>
  <script>
    document.addEventListener("DOMContentLoaded", function() {
      const formContainer = document.getElementById('form-container');
      const formHtml = `
        <form action="/submit-form" method="post">
          <label for="name">Name:</label>
          <input type="text" id="name" name="name" required>

          <label for="email">Email:</label>
          <input type="email" id="email" name="email" required>

          <button type="submit">Submit</button>
        </form>
      `;
      formContainer.innerHTML = formHtml;

      formContainer.querySelector('form').addEventListener('submit', function(event) {
        event.preventDefault();
        console.log('Form submitted:', event.target);
      });
    });
  </script>
</body>
</html>