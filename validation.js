document.addEventListener('DOMContentLoaded', () => {
    const forms = document.querySelectorAll('input, select');
    
    forms.forEach(input => {
        input.addEventListener('input', () => {
            if (input.validity.valid) {
                input.parentElement.querySelector('.error-message').style.display = 'none';
            }
        });
        
        input.addEventListener('invalid', (e) => {
            e.preventDefault();
            const errorElement = input.parentElement.querySelector('.error-message');
            errorElement.textContent = getValidationMessage(input);
            errorElement.style.display = 'block';
        });
    });

    function getValidationMessage(input) {
        if (input.validity.valueMissing) return 'This field is required';
        if (input.validity.patternMismatch) return 'Invalid format';
        if (input.validity.rangeUnderflow) return `Minimum value: ${input.min}`;
        return 'Invalid input';
    }
});