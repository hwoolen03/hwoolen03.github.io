document.addEventListener('DOMContentLoaded', () => {
    const forms = document.querySelectorAll('input, select');
    
    forms.forEach(input => {
        // Create error element if it doesn't exist
        if (!input.parentElement.querySelector('.error-message')) {
            const errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            input.parentElement.appendChild(errorElement);
        }

        input.addEventListener('input', () => {
            const errorElement = input.parentElement.querySelector('.error-message');
            if (input.validity.valid) {
                errorElement.style.display = 'none';
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
        
        // Custom date validation
        if (input.id === 'returnDate') {
            const checkInDate = new Date(document.getElementById('holidayDate').value);
            const returnDate = new Date(input.value);
            if (returnDate < checkInDate) {
                return 'Return date must be after check-in date';
            }
        }
        
        return 'Invalid input';
    }
});
