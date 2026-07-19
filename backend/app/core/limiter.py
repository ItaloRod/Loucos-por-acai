from slowapi import Limiter
from slowapi.util import get_remote_address

# Inicializa o rate limiter compartilhado
limiter = Limiter(key_func=get_remote_address)
